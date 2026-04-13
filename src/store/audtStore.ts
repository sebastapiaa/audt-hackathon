import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentStatus = 'pending' | 'running' | 'complete' | 'failed';
export type AgentId = 'concept' | 'feasibility' | 'landscape' | 'grants' | 'orchestrator' | 'due-diligence' | 'legal' | 'feedback';

export interface Agent {
  id: AgentId;
  name: string;
  status: AgentStatus;
  updates: string[];
  summary?: string;
  data?: unknown;
}

export interface GraphNode {
  id: string;
  label: string;
  severity: 'high' | 'medium' | 'low';
  title?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  similarity: number;
}

export interface ClaimScore {
  id: number;
  claim: string;
  score: number;
  label: string;
}

export interface GrantEntry {
  name: string;
  agency: string;
  amount: string;
  relevance: string;
  deadline?: string;
}

export interface Investigation {
  id: string;
  title: string;
  domain: string;
  description: string;
  context: string;
  verdict?: 'green' | 'yellow' | 'red';
  agents: Agent[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  /** Feasibility report HTML */
  feasibilityReport?: string;
  /** Due diligence report HTML */
  dueDiligenceReport?: string;
  /** Patent application draft HTML */
  legalDraft?: string;
  claimScores: ClaimScore[];
  grants: GrantEntry[];
  orchestratorSummary?: string;
  status: 'running' | 'complete' | 'failed';
  createdAt: number;
}

// ── Agent definitions (order matches pipeline) ────────────────────────────────

const AGENT_DEFS: Array<{ id: AgentId; name: string }> = [
  { id: 'concept', name: 'Concept Extractor' },
  { id: 'feasibility', name: 'Feasibility' },
  { id: 'landscape', name: 'Landscape' },
  { id: 'grants', name: 'Grants' },
  { id: 'orchestrator', name: 'Orchestrator' },
  { id: 'due-diligence', name: 'Due Diligence' },
  { id: 'legal', name: 'Legal Draft' },
  { id: 'feedback', name: 'Feedback' },
];

export function makeAgents(): Agent[] {
  return AGENT_DEFS.map(d => ({ id: d.id, name: d.name, status: 'pending', updates: [] }));
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface AudtState {
  investigations: Investigation[];
  currentId: string | null;

  setCurrent: (id: string | null) => void;
  addInvestigation: (inv: Investigation) => void;
  updateAgent: (invId: string, agentId: string, patch: Partial<Agent>) => void;
  appendAgentUpdate: (invId: string, agentId: string, text: string) => void;
  addGraphNode: (invId: string, node: GraphNode) => void;
  addGraphEdge: (invId: string, edge: GraphEdge) => void;
  setReport: (invId: string, reportType: 'feasibility' | 'dueDiligence' | 'legal', html: string) => void;
  setLegalDraft: (invId: string, html: string, scores: ClaimScore[]) => void;
  updateClaimScores: (invId: string, scores: ClaimScore[]) => void;
  setGrants: (invId: string, grants: GrantEntry[]) => void;
  completePipeline: (invId: string, verdict: 'green' | 'yellow' | 'red', summary: string) => void;
}

function patchInv(
  investigations: Investigation[],
  invId: string,
  fn: (inv: Investigation) => Investigation,
): Investigation[] {
  return investigations.map(inv => (inv.id === invId ? fn(inv) : inv));
}

export const useAudtStore = create<AudtState>()(
  persist(
    (set) => ({
      investigations: [],
      currentId: null,

      setCurrent: (id) => set({ currentId: id }),

      addInvestigation: (inv) =>
        set(s => ({ investigations: [inv, ...s.investigations] })),

      updateAgent: (invId, agentId, patch) =>
        set(s => ({
          investigations: patchInv(s.investigations, invId, inv => ({
            ...inv,
            agents: inv.agents.map(a => (a.id === agentId ? { ...a, ...patch } : a)),
          })),
        })),

      appendAgentUpdate: (invId, agentId, text) =>
        set(s => ({
          investigations: patchInv(s.investigations, invId, inv => ({
            ...inv,
            agents: inv.agents.map(a =>
              a.id === agentId ? { ...a, updates: [...a.updates, text] } : a,
            ),
          })),
        })),

      addGraphNode: (invId, node) =>
        set(s => ({
          investigations: patchInv(s.investigations, invId, inv => ({
            ...inv,
            graphNodes: [...inv.graphNodes.filter(n => n.id !== node.id), node],
          })),
        })),

      addGraphEdge: (invId, edge) =>
        set(s => ({
          investigations: patchInv(s.investigations, invId, inv => ({
            ...inv,
            graphEdges: [
              ...inv.graphEdges.filter(
                e => !(e.source === edge.source && e.target === edge.target),
              ),
              edge,
            ],
          })),
        })),

      setReport: (invId, reportType, html) =>
        set(s => ({
          investigations: patchInv(s.investigations, invId, inv => ({
            ...inv,
            ...(reportType === 'feasibility' ? { feasibilityReport: html } : {}),
            ...(reportType === 'dueDiligence' ? { dueDiligenceReport: html } : {}),
            ...(reportType === 'legal' ? { legalDraft: html } : {}),
          })),
        })),

      setLegalDraft: (invId, html, scores) =>
        set(s => ({
          investigations: patchInv(s.investigations, invId, inv => ({
            ...inv,
            legalDraft: html,
            claimScores: scores,
          })),
        })),

      updateClaimScores: (invId, scores) =>
        set(s => ({
          investigations: patchInv(s.investigations, invId, inv => ({
            ...inv,
            claimScores: scores,
          })),
        })),

      setGrants: (invId, grants) =>
        set(s => ({
          investigations: patchInv(s.investigations, invId, inv => ({ ...inv, grants })),
        })),

      completePipeline: (invId, verdict, summary) =>
        set(s => ({
          investigations: patchInv(s.investigations, invId, inv => ({
            ...inv,
            verdict,
            orchestratorSummary: summary,
            status: 'complete',
          })),
        })),
    }),
    { name: 'audt-v1' },
  ),
);
