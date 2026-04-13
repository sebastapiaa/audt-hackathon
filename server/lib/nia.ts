import { NiaSDK } from 'nia-ai-ts';

let _sdk: NiaSDK | null = null;

export function getNia(): NiaSDK {
  if (!_sdk) {
    const apiKey = process.env.NIA_API_KEY;
    if (!apiKey) throw new Error('NIA_API_KEY is not set');
    _sdk = new NiaSDK({
      apiKey,
      baseUrl: 'https://apigcp.trynia.ai/v2',
      maxRetries: 2,
      initialBackoffMs: 500,
    });
  }
  return _sdk;
}

/**
 * Parse a URL or identifier into a GitHub owner/repo string, if applicable.
 * e.g. "https://github.com/foo/bar" → "foo/bar"
 *      "foo/bar" → "foo/bar"
 *      "https://docs.example.com" → null
 */
export function parseGitHubIdentifier(input: string): string | null {
  // Already in owner/repo format
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(input)) return input;
  const match = input.match(/github\.com\/([^/\s]+\/[^/\s]+?)(?:\.git)?(?:\/|$)/);
  return match ? match[1] : null;
}

/**
 * Split a list of source identifiers into GitHub repos (for oracle `repositories`)
 * and generic URLs (to be included in query text).
 */
export function splitSources(identifiers: string[]): { repos: string[]; urls: string[] } {
  const repos: string[] = [];
  const urls: string[] = [];
  for (const id of identifiers) {
    const gh = parseGitHubIdentifier(id);
    if (gh) repos.push(gh);
    else urls.push(id);
  }
  return { repos, urls };
}

/** Deep oracle research with optional targeted sources */
export async function oracleResearch(
  query: string,
  sourceIdentifiers: string[] = [],
  timeoutMs = 15000,
): Promise<string> {
  const sdk = getNia();
  const { repos, urls } = splitSources(sourceIdentifiers);

  // Append non-GitHub sources to query so oracle is aware of them
  const fullQuery = urls.length
    ? `${query}\n\nAlso scan these configured sources: ${urls.join(', ')}`
    : query;

  const payload: Record<string, unknown> = { query: fullQuery };
  if (repos.length) payload.repositories = repos;

  const job = await sdk.oracle.createJob(payload);
  const result = await sdk.oracle.waitForJob(job.id, timeoutMs, 3000);
  return extractText(result);
}

/** Fast web search with optional source hints */
export async function webSearch(
  query: string,
  sourceIdentifiers: string[] = [],
  topK = 8,
): Promise<string> {
  const sdk = getNia();
  const { urls } = splitSources(sourceIdentifiers);
  const fullQuery = urls.length ? `${query} sources: ${urls.join(' ')}` : query;
  const result = await sdk.search.web({ query: fullQuery, top_k: topK }) as Record<string, unknown>;
  return extractText(result);
}

/** Index a source URL into the user's Nia workspace */
export async function indexSource(url: string): Promise<string> {
  const sdk = getNia();
  const source = await sdk.sources.create({ url });
  return (source as { id?: string }).id ?? url;
}

function extractText(result: Record<string, unknown>): string {
  if (typeof result === 'string') return result;
  for (const key of ['report', 'content', 'markdown', 'text', 'result', 'answer']) {
    if (typeof result[key] === 'string') return result[key] as string;
  }
  return JSON.stringify(result);
}
