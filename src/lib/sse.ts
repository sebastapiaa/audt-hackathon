import {
  useAudtStore,
  type ClaimScore,
  type GrantEntry,
} from '../store/audtStore';

// ── Event types (mirrors server/types.ts) ─────────────────────────────────────

export type AgentId =
  | 'concept'
  | 'feasibility'
  | 'landscape'
  | 'grants'
  | 'orchestrator'
  | 'due-diligence'
  | 'legal'
  | 'feedback';

export type AgentEvent =
  | { type: 'agent_start'; agentId: AgentId }
  | { type: 'agent_update'; agentId: AgentId; text: string }
  | { type: 'agent_complete'; agentId: AgentId; summary: string; data: unknown }
  | { type: 'agent_failed'; agentId: AgentId; error: string }
  | { type: 'graph_node'; node: { id: string; label: string; severity: 'high' | 'medium' | 'low'; title?: string } }
  | { type: 'graph_edge'; edge: { source: string; target: string; similarity: number } }
  | { type: 'report_ready'; reportType: 'feasibility' | 'dueDiligence' | 'legal'; html: string }
  | { type: 'pipeline_complete'; verdict: 'green' | 'yellow' | 'red'; summary: string }
  | { type: 'error'; message: string };

// ── Active connections ─────────────────────────────────────────────────────────

const connections = new Map<string, EventSource>();

export function connectSSE(invId: string): EventSource {
  // Close existing connection for this investigation if any
  disconnectSSE(invId);

  const es = new EventSource(`/api/investigate/${invId}/stream`);

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as AgentEvent;
      handleEvent(invId, data);
    } catch {
      // ignore parse errors
    }
  };

  es.onerror = () => {
    // EventSource will auto-reconnect; clean up on terminal errors
    if (es.readyState === EventSource.CLOSED) {
      connections.delete(invId);
    }
  };

  connections.set(invId, es);
  return es;
}

export function disconnectSSE(invId: string) {
  const es = connections.get(invId);
  if (es) {
    es.close();
    connections.delete(invId);
  }
}

// ── Dispatch events → Zustand store ──────────────────────────────────────────

function handleEvent(invId: string, event: AgentEvent) {
  const store = useAudtStore.getState();

  switch (event.type) {
    case 'agent_start':
      store.updateAgent(invId, event.agentId, { status: 'running' });
      break;

    case 'agent_update':
      store.appendAgentUpdate(invId, event.agentId, event.text);
      break;

    case 'agent_complete': {
      store.updateAgent(invId, event.agentId, { status: 'complete', summary: event.summary, data: event.data });

      // Handle agent-specific data payloads
      const d = event.data as Record<string, unknown> | null;
      if (!d) break;

      if (event.agentId === 'legal' && typeof d.html === 'string') {
        store.setLegalDraft(invId, d.html, (d.claimScores as ClaimScore[]) ?? []);
      }
      if (event.agentId === 'feedback' && Array.isArray(d.updatedClaimScores)) {
        store.updateClaimScores(invId, d.updatedClaimScores as ClaimScore[]);
      }
      if (event.agentId === 'grants' && Array.isArray((d as { grants?: unknown }).grants)) {
        store.setGrants(invId, (d as { grants: GrantEntry[] }).grants);
      }
      break;
    }

    case 'agent_failed':
      store.updateAgent(invId, event.agentId, { status: 'failed' });
      break;

    case 'graph_node':
      store.addGraphNode(invId, event.node);
      break;

    case 'graph_edge':
      store.addGraphEdge(invId, event.edge);
      break;

    case 'report_ready':
      store.setReport(invId, event.reportType, event.html);
      break;

    case 'pipeline_complete':
      store.completePipeline(invId, event.verdict, event.summary);
      disconnectSSE(invId);
      break;

    default:
      break;
  }
}
