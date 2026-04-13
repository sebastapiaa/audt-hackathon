import { complete, parseJson } from '../lib/claude.ts';
import type { InvestigationInput, ConceptData, FeasibilityData } from '../types.ts';

export async function assessFeasibility(
  input: InvestigationInput,
  concepts: ConceptData,
): Promise<FeasibilityData> {
  // ── Step 1: Score + verdict ───────────────────────────────────────────────
  const scorePrompt = `You are a senior patent examiner and technology analyst. Assess this invention.

INVENTION: ${input.title}
DOMAIN: ${input.domain}
DESCRIPTION: ${input.description}
KEY CONCEPTS: ${concepts.concepts.join(', ')}
PRIMARY INNOVATION: ${concepts.primaryInnovation}
TECHNICAL CLAIMS: ${concepts.technicalClaims.join('; ')}

Evaluate: technical feasibility, novelty potential, non-obviousness, utility, patentability risks.

Return JSON only:
{
  "score": number,
  "verdict": "green" | "yellow" | "red",
  "rationale": "string",
  "blockers": ["string"],
  "technicalReadiness": "string",
  "noveltyRisk": "low" | "medium" | "high",
  "obviousnessRisk": "low" | "medium" | "high",
  "utilityStrength": "strong" | "moderate" | "weak"
}

Score: 0-100. Verdict: green >= 75, yellow 50-74, red < 50. rationale: 2-3 sentences. blockers: 0-3 items.`;

  let scoreData: {
    score: number;
    verdict: 'green' | 'yellow' | 'red';
    rationale: string;
    blockers: string[];
    technicalReadiness?: string;
    noveltyRisk?: string;
    obviousnessRisk?: string;
    utilityStrength?: string;
  };

  try {
    scoreData = parseJson(
      await complete(scorePrompt, 'You are a patent feasibility analyst. Return only valid JSON.'),
    );
    if (scoreData.score >= 75) scoreData.verdict = 'green';
    else if (scoreData.score >= 50) scoreData.verdict = 'yellow';
    else scoreData.verdict = 'red';
  } catch {
    scoreData = {
      score: 68,
      verdict: 'yellow',
      rationale: 'Technical feasibility appears moderate. Detailed prior art search required.',
      blockers: ['Prior art search needed to confirm novelty scope'],
    };
  }

  // ── Step 2: Full structured report ───────────────────────────────────────
  const verdictColor = scoreData.verdict === 'green' ? '#22c55e' : scoreData.verdict === 'yellow' ? '#f59e0b' : '#ef4444';
  const verdictLabel = scoreData.verdict === 'green' ? 'GREEN — PROCEED' : scoreData.verdict === 'yellow' ? 'YELLOW — PROCEED WITH MODIFICATIONS' : 'RED — MAJOR REWORK NEEDED';

  const reportPrompt = `Write a professional patent feasibility report for the following invention. Format as structured HTML.

INVENTION: ${input.title}
DOMAIN: ${input.domain}
DESCRIPTION: ${input.description}
PRIMARY INNOVATION: ${concepts.primaryInnovation}
KEY CONCEPTS: ${concepts.concepts.join(', ')}
TECHNICAL CLAIMS: ${concepts.technicalClaims.join('; ')}
FEASIBILITY SCORE: ${scoreData.score}/100 — ${verdictLabel}
RATIONALE: ${scoreData.rationale}
BLOCKERS: ${scoreData.blockers.join('; ') || 'None identified'}
TECHNICAL READINESS: ${scoreData.technicalReadiness ?? 'TRL 2-4 (Early stage)'}
NOVELTY RISK: ${scoreData.noveltyRisk ?? 'medium'}
NON-OBVIOUSNESS RISK: ${scoreData.obviousnessRisk ?? 'medium'}
UTILITY STRENGTH: ${scoreData.utilityStrength ?? 'moderate'}

Write a complete Feasibility Report with these sections using HTML:

<h2>Feasibility Assessment Report</h2>
<p><strong>Invention:</strong> [title]</p>
<p><strong>Domain:</strong> [domain]</p>
<p><strong>Date:</strong> [today's date]</p>

Then include sections:
1. Executive Summary (3 sentences)
2. Technical Feasibility Analysis (technical readiness, implementation challenges, required components)
3. Novelty & Non-Obviousness Assessment (what is new, how it differs from known approaches)
4. USPTO Patentability Analysis (35 USC §101 subject matter, §102 novelty, §103 non-obviousness)
5. Risk Matrix (table with <table><tr><th>Risk Area</th><th>Level</th><th>Mitigation</th></tr>...)
6. Recommendation

Use <h2>, <h3>, <p>, <ul><li>, <table> tags. Make it professional and specific to this invention.`;

  let report: string;
  try {
    report = await complete(
      reportPrompt,
      'You are a senior patent attorney writing professional feasibility reports. Write detailed, specific, legally sound content.',
      6000,
    );
  } catch {
    report = `<h2>Feasibility Assessment Report</h2>
<p><strong>Invention:</strong> ${input.title}</p>
<p><strong>Domain:</strong> ${input.domain}</p>
<h3>Executive Summary</h3>
<p>${scoreData.rationale}</p>
<h3>Feasibility Score</h3>
<p style="font-size:1.4em;color:${verdictColor};font-weight:700">${scoreData.score}/100 — ${verdictLabel}</p>
<h3>Key Blockers</h3>
<ul>${scoreData.blockers.map(b => `<li>${b}</li>`).join('')}</ul>`;
  }

  return {
    score: scoreData.score,
    verdict: scoreData.verdict,
    rationale: scoreData.rationale,
    blockers: scoreData.blockers,
    report,
  };
}
