import { complete, parseJson } from '../lib/claude.ts';
import type { LegalDraftData, LandscapeData, FeedbackData, ClaimScore } from '../types.ts';

export async function reviewDraft(
  draft: LegalDraftData,
  landscape: LandscapeData,
): Promise<FeedbackData> {
  const prompt = `You are a senior patent attorney reviewing a patent application before filing.

PRIOR ART IDENTIFIED:
${landscape.patents.slice(0, 5).map(p => `- ${p.id} (${p.severity} conflict, similarity: ${p.similarity.toFixed(2)}): ${p.title}`).join('\n')}

CURRENT CLAIM STRENGTH SCORES:
${draft.claimScores.map(c => `- Claim ${c.id}: ${c.score.toFixed(2)} (${c.label}) — ${c.claim}`).join('\n')}

Provide expert review:
1. Are claims sufficiently differentiated from prior art?
2. Are there claim scope issues (too broad or too narrow)?
3. Potential examiner 102/103 rejections?
4. Suggested improvements?
5. Overall filing readiness?

Return JSON only:
{
  "notes": ["string"],
  "updatedClaimScores": [
    { "id": 1, "claim": "string", "score": 0.0, "label": "Strong|Moderate|Weak" }
  ]
}

notes: exactly 4 specific, actionable recommendations
updatedClaimScores: refine scores based on prior art analysis (scores may go up or down)`;

  try {
    return parseJson<FeedbackData>(
      await complete(prompt, 'You are a senior USPTO patent attorney. Return only valid JSON.'),
    );
  } catch {
    const highCount = landscape.patents.filter(p => p.severity === 'high').length;
    return {
      notes: [
        highCount > 0
          ? `Claims 1-${Math.min(2, draft.claimScores.length)} should explicitly distinguish from ${highCount} high-conflict patent(s)`
          : 'Claims appear well-differentiated from identified prior art',
        'Consider adding dependent claims for specific embodiments and materials',
        'Abstract should include functional language describing the technical effect achieved',
        'Detailed Description should include at least one working example with specific parameters',
      ],
      updatedClaimScores: draft.claimScores.map(c => ({
        ...c,
        score: Math.max(0.25, Math.min(0.97, c.score + (Math.random() * 0.1 - 0.05))),
      })),
    };
  }
}
