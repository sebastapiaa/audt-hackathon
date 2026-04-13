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
  | { type: 'graph_node'; node: GraphNode }
  | { type: 'graph_edge'; edge: GraphEdge }
  | { type: 'report_ready'; reportType: 'feasibility' | 'dueDiligence' | 'legal'; html: string }
  | { type: 'pipeline_complete'; verdict: 'green' | 'yellow' | 'red'; summary: string };

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

export interface InvestigationInput {
  title: string;
  domain: string;
  description: string;
  context: string;
  answers?: Array<{ question: string; answer: string }>;
  /** Nia source identifiers (GitHub owner/repo or indexed URL) passed from Settings */
  sourceIdentifiers?: string[];
}

export interface ConceptData {
  concepts: string[];
  keywords: string[];
  primaryInnovation: string;
  technicalClaims: string[];
}

export interface FeasibilityData {
  score: number;
  verdict: 'green' | 'yellow' | 'red';
  rationale: string;
  blockers: string[];
  /** Full HTML feasibility report */
  report: string;
}

export interface PatentEntry {
  id: string;
  label: string;
  title: string;
  similarity: number;
  severity: 'high' | 'medium' | 'low';
  description?: string;
}

export interface LandscapeData {
  patents: PatentEntry[];
  summary: string;
}

export interface GrantEntry {
  name: string;
  agency: string;
  amount: string;
  relevance: string;
  deadline?: string;
}

export interface GrantsData {
  grants: GrantEntry[];
}

export interface OrchestratorData {
  summary: string;
  verdict: 'green' | 'yellow' | 'red';
  recommendation: string;
  keyFindings: string[];
}

export interface DueDiligenceData {
  /** Full HTML due diligence report */
  html: string;
}

export interface ClaimScore {
  id: number;
  claim: string;
  score: number;
  label: string;
}

export interface LegalDraftData {
  html: string;
  claimScores: ClaimScore[];
}

export interface FeedbackData {
  notes: string[];
  updatedClaimScores: ClaimScore[];
}

export interface PipelineState {
  invId: string;
  input: InvestigationInput;
  concept?: ConceptData;
  feasibility?: FeasibilityData;
  landscape?: LandscapeData;
  grants?: GrantsData;
  orchestrator?: OrchestratorData;
  dueDiligence?: DueDiligenceData;
  legalDraft?: LegalDraftData;
  feedback?: FeedbackData;
  status: 'running' | 'complete' | 'failed';
  createdAt: number;
}
