// REST API client — thin wrappers over fetch

export interface ClarifyResponse {
  questions: string[];
}

export interface StartResponse {
  id: string;
}

export interface IndexSourceResponse {
  niaId: string;
}

export interface InvestigationInput {
  title: string;
  domain: string;
  description: string;
  context: string;
  answers?: Array<{ question: string; answer: string }>;
  /** Nia source identifiers from Settings → Sources */
  sourceIdentifiers?: string[];
}

export async function getClarifyingQuestions(
  input: Omit<InvestigationInput, 'answers' | 'sourceIdentifiers'>,
): Promise<ClarifyResponse> {
  const res = await fetch('/api/clarify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`/api/clarify ${res.status}`);
  return res.json();
}

export async function startInvestigation(input: InvestigationInput): Promise<StartResponse> {
  const res = await fetch('/api/investigate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`/api/investigate ${res.status}`);
  return res.json();
}

export async function indexNiaSource(url: string): Promise<IndexSourceResponse> {
  const res = await fetch('/api/sources/index', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
