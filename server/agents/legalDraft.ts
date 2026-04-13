import { complete, parseJson } from '../lib/claude.ts';
import type {
  InvestigationInput,
  ConceptData,
  LandscapeData,
  OrchestratorData,
  LegalDraftData,
  ClaimScore,
} from '../types.ts';

export async function generateLegalDraft(
  input: InvestigationInput,
  concepts: ConceptData,
  landscape: LandscapeData,
  orchestrator: OrchestratorData,
  emit: (text: string) => void = () => {},
): Promise<LegalDraftData> {
  const highConflict = landscape.patents.filter(p => p.severity === 'high');
  const priorArtNote = highConflict.length
    ? `\nKEY PRIOR ART TO DISTINGUISH:\n${highConflict.map(p => `- ${p.id}: ${p.title}`).join('\n')}`
    : '';

  const draftPrompt = `You are a senior patent attorney. Write a complete, professional patent application for filing with the USPTO.

INVENTION TITLE: ${input.title}
DOMAIN: ${input.domain}
INVENTOR DESCRIPTION: ${input.description}${input.context ? `\nCONTEXT: ${input.context}` : ''}
PRIMARY INNOVATION: ${concepts.primaryInnovation}
KEY TECHNICAL CONCEPTS: ${concepts.concepts.join(', ')}
INDEPENDENT CLAIMS BASIS:
${concepts.technicalClaims.map((c, i) => `${i + 1}. ${c}`).join('\n')}
OVERALL VERDICT: ${orchestrator.verdict.toUpperCase()}${priorArtNote}

Write the complete patent application with these sections. Use HTML formatting:
- <h2> for main section headings
- <h3> for subsection headings
- <p> for paragraphs
- <ol><li> for numbered claims
- <strong> for key terms

Required sections:
1. TITLE OF THE INVENTION
2. ABSTRACT (150-200 words, single paragraph)
3. BACKGROUND OF THE INVENTION (2-3 paragraphs: field, prior art problems)
4. SUMMARY OF THE INVENTION (2 paragraphs: what it is, key advantages)
5. DETAILED DESCRIPTION OF THE PREFERRED EMBODIMENTS (3-4 paragraphs with technical specifics)
6. CLAIMS (at least 3 independent + 3 dependent claims)

Make the claims broad but defensible. Explicitly distinguish from the identified prior art.`;

  emit('Generating abstract and background...');

  // Race Claude against a 90-second timeout so we always get a result
  const draftTimeout = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('Draft generation timed out')), 90_000),
  );

  let html: string;
  try {
    const draftPromise = complete(
      draftPrompt,
      'You are a senior USPTO patent attorney. Write professional, legally sound patent applications.',
      8192,
    );
    // Emit progress ticks while waiting (every 10s)
    const tick = setInterval(() => emit('Writing claims and detailed description...'), 10_000);
    html = await Promise.race([draftPromise, draftTimeout]);
    clearInterval(tick);
  } catch {
    emit('Using structured template...');
    html = buildFallbackDraft(input, concepts, landscape, orchestrator);
  }

  emit('Scoring individual claims...');

  // Score the claims
  const claimPrompt = `Rate the strength of these patent claims for "${input.title}".

CLAIMS:
${concepts.technicalClaims.map((c, i) => `Claim ${i + 1}: ${c}`).join('\n')}

PRIOR ART CONFLICT:
${landscape.patents.slice(0, 3).map(p => `- ${p.title} (similarity: ${p.similarity.toFixed(2)})`).join('\n')}

Return JSON only:
{
  "scores": [
    {
      "id": 1,
      "claim": "claim text (shortened to 80 chars max)",
      "score": 0.85,
      "label": "Strong"
    }
  ]
}

label: "Strong" (score >= 0.75), "Moderate" (0.50-0.74), "Weak" (< 0.50)
Adjust scores based on prior art similarity — higher prior art similarity = lower claim strength.`;

  let claimScores: ClaimScore[] = [];
  try {
    const parsed = parseJson<{ scores: ClaimScore[] }>(
      await complete(claimPrompt, 'Return only valid JSON.'),
    );
    claimScores = parsed.scores;
  } catch {
    claimScores = concepts.technicalClaims.map((c, i) => {
      const maxConflict = Math.max(...landscape.patents.map(p => p.similarity), 0);
      const base = Math.max(0.35, 0.92 - i * 0.15 - maxConflict * 0.2);
      return {
        id: i + 1,
        claim: c.slice(0, 80),
        score: parseFloat(base.toFixed(2)),
        label: base >= 0.75 ? 'Strong' : base >= 0.5 ? 'Moderate' : 'Weak',
      };
    });
  }

  return { html, claimScores };
}

function buildFallbackDraft(
  input: InvestigationInput,
  concepts: ConceptData,
  landscape: LandscapeData,
  orchestrator: OrchestratorData,
): string {
  const highConflict = landscape.patents.filter(p => p.severity === 'high');
  const claims = concepts.technicalClaims;
  const year = new Date().getFullYear();

  const independentClaims = claims.slice(0, 3).map((c, i) => `<li><strong>Claim ${i + 1}.</strong> ${c}</li>`);
  const dependentClaims = [
    `<li><strong>Claim ${claims.length + 1}.</strong> The system of claim 1, wherein the ${concepts.concepts[0] ?? 'primary component'} operates using machine learning inference.</li>`,
    `<li><strong>Claim ${claims.length + 2}.</strong> The system of claim 1, wherein data is processed in real-time with latency under 100 milliseconds.</li>`,
    `<li><strong>Claim ${claims.length + 3}.</strong> A non-transitory computer-readable medium storing instructions that, when executed, implement the method of claim 2.</li>`,
  ];

  const priorArtDistinction = highConflict.length
    ? `<p>The present invention is patentably distinct from the closest prior art including ${highConflict.map(p => p.id).join(', ')}. Unlike those references, the present invention ${concepts.primaryInnovation.toLowerCase()}.</p>`
    : '';

  return `<h2>UNITED STATES PATENT APPLICATION</h2>
<p><strong>Application Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
<p><strong>Status:</strong> ${orchestrator.verdict.toUpperCase()} — ${orchestrator.recommendation}</p>

<h2>TITLE OF THE INVENTION</h2>
<p>${input.title.toUpperCase()}</p>

<h2>ABSTRACT</h2>
<p>The present invention relates to ${input.domain.toLowerCase()} technology and provides ${input.title}. ${concepts.primaryInnovation} The invention addresses longstanding problems in ${input.domain} by implementing ${concepts.concepts.slice(0, 3).join(', ')}. The disclosed system and method provide significant improvements over prior art by enabling more efficient, accurate, and scalable solutions. The invention is suitable for commercial deployment across multiple industry verticals including but not limited to ${input.domain}.</p>

<h2>BACKGROUND OF THE INVENTION</h2>
<h3>Field of the Invention</h3>
<p>The present invention pertains to the field of ${input.domain}. More specifically, the invention relates to systems and methods for ${input.title.toLowerCase()}, incorporating the technical concepts of ${concepts.concepts.join(', ')}.</p>

<h3>Description of the Related Art</h3>
<p>Existing solutions in the ${input.domain} space suffer from numerous deficiencies. Current approaches are limited in their ability to handle ${concepts.concepts[0] ?? 'core functionality'} efficiently at scale. Prior systems require extensive manual intervention, lack adaptability to dynamic environments, and do not integrate modern computational approaches.</p>
${priorArtDistinction}
<p>There exists a clear and unmet need for improved systems and methods that overcome the above limitations. The present invention satisfies this need.</p>

<h2>SUMMARY OF THE INVENTION</h2>
<p>${concepts.primaryInnovation} The invention provides a novel approach to ${input.title.toLowerCase()} that addresses the deficiencies identified in the prior art.</p>
<p>Key advantages of the present invention include: (1) improved performance through ${concepts.concepts[0] ?? 'novel algorithms'}; (2) reduced complexity and cost; (3) enhanced scalability for enterprise deployment; and (4) seamless integration with existing ${input.domain} infrastructure.</p>

<h2>DETAILED DESCRIPTION OF THE PREFERRED EMBODIMENTS</h2>
<p>The following detailed description sets forth specific embodiments of the invention. It is understood that the invention is not limited to the embodiments described herein.</p>
<p>${input.description}</p>
${input.context ? `<p>${input.context}</p>` : ''}
<p>In a preferred embodiment, the system comprises components implementing ${concepts.concepts.join(', ')}. The technical architecture enables ${concepts.primaryInnovation.toLowerCase()}. The system processes input data through a multi-stage pipeline, applying ${concepts.keywords.slice(0, 4).join(', ')} at each stage to produce the desired output with high accuracy and low latency.</p>
<p>The method of the present invention may be implemented in software executing on general-purpose hardware, specialized ASICs, FPGAs, or a combination thereof. Cloud-native deployment is contemplated, as is edge deployment for latency-sensitive applications.</p>

<h2>CLAIMS</h2>
<p><em>What is claimed is:</em></p>
<ol>
${independentClaims.join('\n')}
${dependentClaims.join('\n')}
</ol>

<h2>ABSTRACT OF THE DISCLOSURE</h2>
<p>Systems and methods for ${input.title.toLowerCase()} are disclosed. The invention provides ${concepts.primaryInnovation} Key innovations include ${concepts.concepts.slice(0, 4).join(', ')}. The disclosed technology achieves meaningful improvements over prior art in the ${input.domain} domain. Filing year: ${year}.</p>`;
}
