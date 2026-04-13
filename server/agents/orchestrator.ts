import { complete, parseJson } from '../lib/claude.ts';
import type {
  InvestigationInput,
  ConceptData,
  FeasibilityData,
  LandscapeData,
  GrantsData,
  OrchestratorData,
} from '../types.ts';

export async function orchestrate(
  input: InvestigationInput,
  concept: ConceptData,
  feasibility: FeasibilityData,
  landscape: LandscapeData,
  grants: GrantsData,
): Promise<OrchestratorData> {
  const highConflict = landscape.patents.filter(p => p.severity === 'high');
  const medConflict = landscape.patents.filter(p => p.severity === 'medium');

  const prompt = `You are the chief patent strategy orchestrator. Synthesize all agent findings into an executive summary and actionable recommendation.

INVENTION: ${input.title} (${input.domain})
INNOVATION: ${concept.primaryInnovation}

FEASIBILITY: ${feasibility.score}/100 — ${feasibility.verdict.toUpperCase()}
${feasibility.rationale}
${feasibility.blockers.length ? `Blockers: ${feasibility.blockers.join('; ')}` : ''}

PATENT LANDSCAPE: ${landscape.patents.length} patents found
- High conflict (${highConflict.length}): ${highConflict.map(p => p.title).join(', ') || 'none'}
- Medium conflict (${medConflict.length}): ${medConflict.map(p => p.title).join(', ') || 'none'}
- Landscape: ${landscape.summary}

TOP GRANTS: ${grants.grants.slice(0, 2).map(g => `${g.name} (${g.agency}, ${g.amount})`).join(', ')}

Synthesize into:
{
  "summary": "string",
  "verdict": "green" | "yellow" | "red",
  "recommendation": "string",
  "keyFindings": ["string"]
}

Rules:
- summary: 3-4 sentence executive overview for decision-makers
- verdict: green = proceed (low conflict, high feasibility), yellow = proceed with modifications, red = major rework needed
- recommendation: 1-2 sentences, specific and actionable
- keyFindings: exactly 5 bullet-point findings (mix of risks and opportunities)`;

  try {
    return parseJson<OrchestratorData>(
      await complete(prompt, 'You are a patent strategy expert. Return only valid JSON.'),
    );
  } catch {
    const verdict = feasibility.score >= 75 && highConflict.length === 0 ? 'green'
      : feasibility.score < 50 || highConflict.length > 2 ? 'red'
      : 'yellow';
    return {
      summary: `Analysis of "${input.title}" reveals a ${verdict === 'green' ? 'favorable' : verdict === 'yellow' ? 'mixed' : 'challenging'} patent landscape. Feasibility score of ${feasibility.score}/100 with ${landscape.patents.length} relevant prior art patents identified.`,
      verdict,
      recommendation: highConflict.length > 0
        ? `Refine claims to clearly differentiate from ${highConflict.length} high-conflict patents before filing.`
        : 'Proceed with patent application. Claims appear sufficiently novel.',
      keyFindings: [
        `Feasibility score: ${feasibility.score}/100`,
        `${highConflict.length} high-conflict patents require claim differentiation`,
        `${medConflict.length} medium-conflict patents noted`,
        `${grants.grants.length} funding programs identified`,
        concept.primaryInnovation.slice(0, 100),
      ],
    };
  }
}
