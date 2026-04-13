import { complete, parseJson } from '../lib/claude.ts';
import type { InvestigationInput, ConceptData } from '../types.ts';

export async function extractConcepts(input: InvestigationInput): Promise<ConceptData> {
  const clarifications = input.answers?.length
    ? `\nCLARIFICATIONS:\n${input.answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n')}`
    : '';

  const prompt = `Analyze this patent invention and extract structured technical concepts.

INVENTION TITLE: ${input.title}
DOMAIN: ${input.domain}
DESCRIPTION: ${input.description}${input.context ? `\nADDITIONAL CONTEXT: ${input.context}` : ''}${clarifications}

Return JSON only:
{
  "concepts": ["string"],
  "keywords": ["string"],
  "primaryInnovation": "string",
  "technicalClaims": ["string"]
}

Rules:
- concepts: 6-10 core technical concepts (specific, noun phrases)
- keywords: 10-15 search keywords for patent databases
- primaryInnovation: 1-2 sentences describing what is genuinely novel
- technicalClaims: 3-5 independent claim statements starting with "A method/system/device for..."`;

  try {
    return parseJson<ConceptData>(
      await complete(prompt, 'You are a patent claims analyst. Return only valid JSON. No markdown.'),
    );
  } catch {
    return {
      concepts: [input.title, input.domain, 'novel method', 'improved system'],
      keywords: input.title.toLowerCase().split(/\s+/).filter(w => w.length > 3),
      primaryInnovation: input.description.slice(0, 250),
      technicalClaims: [
        `A method for implementing ${input.title.toLowerCase()}`,
        `A system comprising components for ${input.domain.toLowerCase()} applications`,
        `A device configured to perform ${input.title.toLowerCase()} operations`,
      ],
    };
  }
}
