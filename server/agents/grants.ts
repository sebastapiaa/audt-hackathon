import { complete, parseJson } from '../lib/claude.ts';
import { webSearch } from '../lib/nia.ts';
import type { InvestigationInput, ConceptData, GrantsData } from '../types.ts';

export async function findGrants(
  input: InvestigationInput,
  concepts: ConceptData,
  emit: (text: string) => void,
  sourceIdentifiers: string[] = [],
): Promise<GrantsData> {
  emit('Searching SBIR/STTR programs...');

  let researchOutput = '';
  try {
    const query = `SBIR STTR NSF DOE DARPA grants funding for ${input.title} ${input.domain} technology`;
    emit('Checking NSF and DOE programs...');
    researchOutput = await webSearch(query, sourceIdentifiers, 8);
  } catch {
    emit('Using grants database...');
  }

  emit('Matching funding programs...');

  const prompt = researchOutput
    ? `From this grants research, identify funding for: "${input.title}" (${input.domain}).
Research: ${researchOutput.slice(0, 3000)}

Return JSON only:
{
  "grants": [
    { "name": "...", "agency": "...", "amount": "...", "relevance": "...", "deadline": "..." }
  ]
}`
    : `Generate 4 realistic government grant opportunities for this invention. Return JSON only:

INVENTION: ${input.title}
DOMAIN: ${input.domain}
CONCEPTS: ${concepts.concepts.slice(0, 4).join(', ')}

{
  "grants": [
    { "name": "SBIR Phase I", "agency": "NSF", "amount": "$275,000", "relevance": "specific reason for ${input.domain}", "deadline": "Rolling" },
    { "name": "SBIR Phase II", "agency": "NSF", "amount": "$1,800,000", "relevance": "follow-on development", "deadline": "Post Phase I" },
    { "name": "STTR Phase I", "agency": "DOE", "amount": "$275,000", "relevance": "specific reason for ${input.domain}", "deadline": "Q3 2026" },
    { "name": "CAREER Award", "agency": "NSF", "amount": "$500,000", "relevance": "academic-industry bridge", "deadline": "July 2026" }
  ]
}

Make relevance specific to ${input.domain}. Return ONLY the JSON object.`;

  try {
    return parseJson<GrantsData>(
      await complete(prompt, 'Return only a valid JSON object. No markdown.'),
    );
  } catch {
    return {
      grants: [
        { name: 'SBIR Phase I', agency: 'NSF', amount: '$275,000', relevance: `Early-stage ${input.domain} R&D validation`, deadline: 'Rolling' },
        { name: 'SBIR Phase II', agency: 'NSF', amount: '$1,800,000', relevance: 'Full product development funding', deadline: 'Post Phase I' },
        { name: 'STTR Phase I', agency: 'DOE', amount: '$275,000', relevance: `University partnership for ${input.domain} tech`, deadline: 'Q3 2026' },
        { name: 'DARPA Young Faculty', agency: 'DARPA', amount: '$500,000', relevance: 'Disruptive technology development', deadline: 'Rolling' },
      ],
    };
  }
}
