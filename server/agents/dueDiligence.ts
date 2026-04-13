import { complete } from '../lib/claude.ts';
import type {
  InvestigationInput,
  ConceptData,
  FeasibilityData,
  LandscapeData,
  GrantsData,
  OrchestratorData,
  DueDiligenceData,
} from '../types.ts';

export async function generateDueDiligence(
  input: InvestigationInput,
  concept: ConceptData,
  feasibility: FeasibilityData,
  landscape: LandscapeData,
  grants: GrantsData,
  orchestrator: OrchestratorData,
): Promise<DueDiligenceData> {
  const highConflict = landscape.patents.filter(p => p.severity === 'high');
  const medConflict = landscape.patents.filter(p => p.severity === 'medium');
  const lowConflict = landscape.patents.filter(p => p.severity === 'low');

  const verdictLabel = orchestrator.verdict === 'green'
    ? 'GREEN — RECOMMENDED TO PROCEED'
    : orchestrator.verdict === 'yellow'
    ? 'YELLOW — PROCEED WITH MODIFICATIONS'
    : 'RED — MAJOR CONCERNS IDENTIFIED';

  const prompt = `You are a senior IP attorney conducting comprehensive patent due diligence. Write a full due diligence report.

INVENTION: ${input.title}
DOMAIN: ${input.domain}
DESCRIPTION: ${input.description}
PRIMARY INNOVATION: ${concept.primaryInnovation}
KEY CONCEPTS: ${concept.concepts.join(', ')}
OVERALL VERDICT: ${verdictLabel}
FEASIBILITY SCORE: ${feasibility.score}/100

PATENT LANDSCAPE (${landscape.patents.length} patents found):
- High conflict (${highConflict.length}): ${highConflict.map(p => `${p.id} — ${p.title} (${(p.similarity * 100).toFixed(0)}% similar)`).join('; ') || 'None'}
- Medium conflict (${medConflict.length}): ${medConflict.map(p => `${p.id} — ${p.title}`).join('; ') || 'None'}
- Low conflict (${lowConflict.length}): ${lowConflict.length} patents
- Landscape: ${landscape.summary}

GRANTS & FUNDING (${grants.grants.length} opportunities):
${grants.grants.map(g => `- ${g.name} (${g.agency}): ${g.amount} — ${g.relevance}`).join('\n')}

ORCHESTRATOR FINDINGS:
${orchestrator.keyFindings.map(f => `- ${f}`).join('\n')}
Recommendation: ${orchestrator.recommendation}

Write a comprehensive Due Diligence Report with these exact sections, formatted as HTML:

<h2>Patent Due Diligence Report</h2>
<p>Invention: ${input.title} | Domain: ${input.domain} | Prepared by: Audt Multi-Agent Platform</p>

Required sections (use <h2> for sections, <h3> for subsections, <p> for text, <table> for data):

1. EXECUTIVE SUMMARY — Overall verdict, key findings (3-4 sentences + verdict badge paragraph)

2. INVENTION OVERVIEW — What it is, the technical innovation, key claims

3. PATENT LANDSCAPE ANALYSIS
   - Prior Art Table: HTML table with columns Patent ID | Title | Similarity | Risk Level | Key Overlap
   - Freedom to Operate Analysis: Can this be commercialised without infringing existing patents?
   - Claim Differentiation: How do the proposed claims differ from prior art?

4. MARKET & COMPETITIVE ANALYSIS
   - Target market and size estimate
   - Key competitors and their IP positions
   - Commercial opportunity assessment

5. FREEDOM TO OPERATE (FTO) ASSESSMENT
   - Summary of FTO risk
   - Specific patents that could block commercialization
   - Recommended design-arounds or claim narrowing

6. FUNDING & COMMERCIALISATION PATHWAY
   - Available grants (summary table)
   - Recommended funding sequence
   - Estimated time to market

7. RISK SUMMARY TABLE
   HTML table: Risk Category | Risk Level | Description | Recommended Action

8. STRATEGIC RECOMMENDATIONS
   - 4-6 specific, numbered action items
   - Priority order

9. CONCLUSION

Make every section specific to this invention — no generic boilerplate. Include concrete patent numbers, real grant amounts, and specific technical language.`;

  try {
    const html = await complete(
      prompt,
      'You are a senior IP attorney writing comprehensive patent due diligence reports. Be specific, detailed, and use real patent law terminology.',
      8192,
    );
    return { html };
  } catch {
    return { html: buildFallbackReport(input, feasibility, landscape, grants, orchestrator) };
  }
}

function buildFallbackReport(
  input: InvestigationInput,
  feasibility: FeasibilityData,
  landscape: LandscapeData,
  grants: GrantsData,
  orchestrator: OrchestratorData,
): string {
  const high = landscape.patents.filter(p => p.severity === 'high');
  const verdictColor = orchestrator.verdict === 'green' ? '#22c55e' : orchestrator.verdict === 'yellow' ? '#f59e0b' : '#ef4444';

  return `<h2>Patent Due Diligence Report</h2>
<p><strong>Invention:</strong> ${input.title} &nbsp;|&nbsp; <strong>Domain:</strong> ${input.domain}</p>

<h2>Executive Summary</h2>
<p style="color:${verdictColor};font-weight:700">Overall Verdict: ${orchestrator.verdict.toUpperCase()}</p>
<p>${orchestrator.summary}</p>

<h2>Patent Landscape Analysis</h2>
<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">
  <tr><th>Patent ID</th><th>Title</th><th>Similarity</th><th>Risk</th></tr>
  ${landscape.patents.map(p => `<tr><td class="mono">${p.id}</td><td>${p.title}</td><td>${(p.similarity * 100).toFixed(0)}%</td><td>${p.severity}</td></tr>`).join('')}
</table>
<p>${landscape.summary}</p>

<h2>Freedom to Operate</h2>
<p>${high.length > 0
  ? `${high.length} high-conflict patent(s) identified that require claim differentiation: ${high.map(p => p.id).join(', ')}.`
  : 'No blocking patents identified. Appears to have freedom to operate subject to final clearance search.'}</p>

<h2>Funding Opportunities</h2>
<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">
  <tr><th>Program</th><th>Agency</th><th>Amount</th><th>Relevance</th></tr>
  ${grants.grants.map(g => `<tr><td>${g.name}</td><td>${g.agency}</td><td>${g.amount}</td><td>${g.relevance}</td></tr>`).join('')}
</table>

<h2>Strategic Recommendations</h2>
<ol>${orchestrator.keyFindings.map(f => `<li>${f}</li>`).join('')}</ol>
<p><strong>Primary Recommendation:</strong> ${orchestrator.recommendation}</p>`;
}
