import { v4 as uuid } from 'uuid';
import { extractConcepts } from './agents/conceptExtractor.ts';
import { assessFeasibility } from './agents/feasibility.ts';
import { analyzeLandscape } from './agents/landscape.ts';
import { findGrants } from './agents/grants.ts';
import { orchestrate } from './agents/orchestrator.ts';
import { generateDueDiligence } from './agents/dueDiligence.ts';
import { generateLegalDraft } from './agents/legalDraft.ts';
import { reviewDraft } from './agents/feedback.ts';
import type { AgentEvent, AgentId, InvestigationInput, PipelineState } from './types.ts';

export const pipelines = new Map<string, PipelineState>();

const subscribers = new Map<string, Set<(event: AgentEvent) => void>>();

export function subscribe(invId: string, cb: (event: AgentEvent) => void): () => void {
  if (!subscribers.has(invId)) subscribers.set(invId, new Set());
  subscribers.get(invId)!.add(cb);
  return () => subscribers.get(invId)?.delete(cb);
}

function emit(invId: string, event: AgentEvent) {
  subscribers.get(invId)?.forEach(cb => cb(event));
}

function emitter(invId: string, agentId: AgentId) {
  return (text: string) => emit(invId, { type: 'agent_update', agentId, text });
}

export async function startPipeline(input: InvestigationInput): Promise<string> {
  const invId = uuid();
  const state: PipelineState = { invId, input, status: 'running', createdAt: Date.now() };
  pipelines.set(invId, state);
  run(invId, state).catch(err => {
    console.error(`[pipeline:${invId}] uncaught error`, err);
    state.status = 'failed';
  });
  return invId;
}

async function run(invId: string, state: PipelineState) {
  const { input } = state;
  const sources = input.sourceIdentifiers ?? [];

  try {
    // ── 1. Concept Extractor ──────────────────────────────────────────────
    emit(invId, { type: 'agent_start', agentId: 'concept' });
    emit(invId, { type: 'agent_update', agentId: 'concept', text: 'Parsing invention description...' });
    const concept = await extractConcepts(input);
    state.concept = concept;
    emit(invId, { type: 'agent_update', agentId: 'concept', text: `Extracted ${concept.concepts.length} core concepts` });
    emit(invId, { type: 'agent_update', agentId: 'concept', text: 'Normalised terminology and IPC keywords' });
    emit(invId, {
      type: 'agent_complete',
      agentId: 'concept',
      summary: `${concept.concepts.length} concepts extracted`,
      data: concept,
    });

    // ── 2. Feasibility (score + full report) ─────────────────────────────
    emit(invId, { type: 'agent_start', agentId: 'feasibility' });
    emit(invId, { type: 'agent_update', agentId: 'feasibility', text: 'Scoring technical viability...' });
    const feasibility = await assessFeasibility(input, concept);
    state.feasibility = feasibility;
    emit(invId, { type: 'agent_update', agentId: 'feasibility', text: 'Checking physical constraints and novelty...' });
    emit(invId, { type: 'agent_update', agentId: 'feasibility', text: 'Generating feasibility report...' });
    const fLabel = feasibility.verdict === 'green' ? 'GREEN' : feasibility.verdict === 'yellow' ? 'YELLOW' : 'RED';
    emit(invId, {
      type: 'agent_complete',
      agentId: 'feasibility',
      summary: `Feasibility: ${feasibility.score}/100 — ${fLabel}`,
      data: feasibility,
    });
    // Emit the feasibility report document
    emit(invId, { type: 'report_ready', reportType: 'feasibility', html: feasibility.report });

    // ── 3. Landscape + Grants (parallel, with configured sources) ─────────
    emit(invId, { type: 'agent_start', agentId: 'landscape' });
    emit(invId, { type: 'agent_start', agentId: 'grants' });
    if (sources.length) {
      emit(invId, { type: 'agent_update', agentId: 'landscape', text: `Scanning ${sources.length} configured source(s)...` });
      emit(invId, { type: 'agent_update', agentId: 'grants', text: `Scanning ${sources.length} configured source(s) for funding...` });
    }

    const [landscape, grants] = await Promise.all([
      analyzeLandscape(input, concept, emitter(invId, 'landscape'), sources),
      findGrants(input, concept, emitter(invId, 'grants'), sources),
    ]);

    state.landscape = landscape;
    state.grants = grants;

    // Emit patent graph nodes + edges
    emit(invId, { type: 'graph_node', node: { id: 'invention', label: input.title.slice(0, 40), severity: 'low' } });
    for (const patent of landscape.patents) {
      // Use the patent title as the node label (truncated), keep ID for reference
      const nodeLabel = patent.title
        ? patent.title.slice(0, 38) + (patent.title.length > 38 ? '…' : '')
        : patent.id;
      emit(invId, {
        type: 'graph_node',
        node: { id: patent.id, label: nodeLabel, severity: patent.severity, title: patent.title },
      });
      emit(invId, {
        type: 'graph_edge',
        edge: { source: 'invention', target: patent.id, similarity: patent.similarity },
      });
    }

    const highCount = landscape.patents.filter(p => p.severity === 'high').length;
    emit(invId, {
      type: 'agent_complete',
      agentId: 'landscape',
      summary: `${landscape.patents.length} patents found · ${highCount} high conflict`,
      data: landscape,
    });
    emit(invId, {
      type: 'agent_complete',
      agentId: 'grants',
      summary: `${grants.grants.length} funding programs identified`,
      data: grants,
    });

    // ── 4. Orchestrator ───────────────────────────────────────────────────
    emit(invId, { type: 'agent_start', agentId: 'orchestrator' });
    emit(invId, { type: 'agent_update', agentId: 'orchestrator', text: 'Synthesising all agent findings...' });
    const orch = await orchestrate(input, concept, feasibility, landscape, grants);
    state.orchestrator = orch;
    emit(invId, { type: 'agent_update', agentId: 'orchestrator', text: 'Computing strategic recommendation...' });
    emit(invId, {
      type: 'agent_complete',
      agentId: 'orchestrator',
      summary: `Verdict: ${orch.verdict.toUpperCase()} — ${orch.recommendation.slice(0, 60)}...`,
      data: orch,
    });

    // ── 5. Due Diligence Report ───────────────────────────────────────────
    emit(invId, { type: 'agent_start', agentId: 'due-diligence' });
    emit(invId, { type: 'agent_update', agentId: 'due-diligence', text: 'Compiling prior art analysis...' });
    const dd = await generateDueDiligence(input, concept, feasibility, landscape, grants, orch);
    state.dueDiligence = dd;
    emit(invId, { type: 'agent_update', agentId: 'due-diligence', text: 'Writing FTO analysis...' });
    emit(invId, { type: 'agent_update', agentId: 'due-diligence', text: 'Building risk matrix...' });
    emit(invId, {
      type: 'agent_complete',
      agentId: 'due-diligence',
      summary: 'Due diligence report complete',
      data: dd,
    });
    emit(invId, { type: 'report_ready', reportType: 'dueDiligence', html: dd.html });

    // ── 6. Legal Draft ────────────────────────────────────────────────────
    emit(invId, { type: 'agent_start', agentId: 'legal' });
    emit(invId, { type: 'agent_update', agentId: 'legal', text: 'Drafting patent application...' });
    const legalDraft = await generateLegalDraft(input, concept, landscape, orch, emitter(invId, 'legal'));
    state.legalDraft = legalDraft;
    emit(invId, { type: 'agent_update', agentId: 'legal', text: `Scoring ${legalDraft.claimScores.length} claims...` });
    emit(invId, {
      type: 'agent_complete',
      agentId: 'legal',
      summary: `Draft complete · ${legalDraft.claimScores.length} claims scored`,
      data: legalDraft,
    });
    emit(invId, { type: 'report_ready', reportType: 'legal', html: legalDraft.html });

    // ── 7. Feedback ───────────────────────────────────────────────────────
    emit(invId, { type: 'agent_start', agentId: 'feedback' });
    emit(invId, { type: 'agent_update', agentId: 'feedback', text: 'Reviewing draft quality...' });
    const feedback = await reviewDraft(legalDraft, landscape);
    state.feedback = feedback;
    emit(invId, { type: 'agent_update', agentId: 'feedback', text: 'Checking claim differentiation from prior art...' });
    emit(invId, {
      type: 'agent_complete',
      agentId: 'feedback',
      summary: `${feedback.notes.length} recommendations generated`,
      data: feedback,
    });

    state.status = 'complete';
    emit(invId, {
      type: 'pipeline_complete',
      verdict: orch.verdict,
      summary: orch.summary,
    });

  } catch (err) {
    state.status = 'failed';
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline:${invId}] error:`, msg);
    emit(invId, { type: 'pipeline_complete', verdict: 'red', summary: `Pipeline error: ${msg}` });
  }
}
