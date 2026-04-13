import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactFlow, { Background, Controls, Node, Edge, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { useAudtStore, type Agent } from '../store/audtStore';
import { connectSSE } from '../lib/sse';

// ── Agent card ─────────────────────────────────────────────────────────────────

function agentSummaryTone(agent: Agent): 'emerald' | 'amber' | 'rose' | 'accent' {
  if (agent.id === 'feasibility') {
    const s = agent.summary ?? '';
    if (s.includes('GREEN')) return 'emerald';
    if (s.includes('RED')) return 'rose';
    return 'amber';
  }
  if (agent.id === 'orchestrator') {
    const d = agent.data as { verdict?: string } | null;
    if (d?.verdict === 'green') return 'emerald';
    if (d?.verdict === 'red') return 'rose';
    return 'amber';
  }
  return 'accent';
}

function AgentCard({ agent }: { agent: Agent }) {
  const isActive = agent.status === 'running';
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: 14, borderColor: isActive ? 'var(--accent-b)' : undefined }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`status-dot dot-${agent.status}`} />
          <span style={{ font: "600 14px 'Sora', sans-serif", color: 'var(--text-0)', letterSpacing: '-0.02em' }}>
            {agent.name}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          {agent.status}
        </span>
      </div>

      {agent.updates.length > 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace" }}>
          {agent.updates.map((u, i) => <div key={i}>› {u}</div>)}
        </div>
      )}

      {agent.summary && (
        <div style={{ marginTop: 12 }}>
          <span className={`badge badge-${agentSummaryTone(agent)}`}>{agent.summary}</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Severity → colour ──────────────────────────────────────────────────────────

const sevColor: Record<string, string> = {
  high: 'var(--rose)',
  medium: 'var(--amber)',
  low: 'var(--text-3)',
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Research() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const investigations = useAudtStore(s => s.investigations);
  const setCurrent = useAudtStore(s => s.setCurrent);
  const inv = investigations.find(i => i.id === id);

  // Connect SSE when we arrive on the page (handles browser refresh)
  useEffect(() => {
    if (!id) return;
    setCurrent(id);
    if (inv?.status === 'running') {
      connectSSE(id);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React Flow nodes / edges ──────────────────────────────────────────────

  const nodes: Node[] = useMemo(() => {
    if (!inv?.graphNodes.length) return [];
    const invention = inv.graphNodes.find(n => n.id === 'invention');
    const patents = inv.graphNodes.filter(n => n.id !== 'invention');

    const total = patents.length;
    const radius = Math.max(220, total * 42);

    return [
      ...(invention ? [{
        id: 'invention',
        type: 'default',
        data: {
          label: (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3 }}>{invention.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>YOUR INVENTION</div>
            </div>
          ),
        },
        position: { x: 280, y: 200 },
        style: {
          background: 'var(--accent-dim)',
          border: '2px solid var(--accent)',
          color: 'var(--text-0)',
          fontWeight: 600,
          padding: '10px 14px',
          width: 180,
        },
      }] : []),
      ...patents.map((n, i) => {
        const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
        const color = sevColor[n.severity] ?? 'var(--border-1)';
        return {
          id: n.id,
          type: 'default',
          data: {
            label: (
              <div title={n.title ?? n.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-0)' }}>
                  {n.label}
                </div>
                <div style={{ fontSize: 9.5, opacity: 0.55, marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
                  {n.id}
                </div>
              </div>
            ),
          },
          position: {
            x: 280 + radius * Math.cos(angle),
            y: 200 + radius * Math.sin(angle),
          },
          style: {
            borderColor: color,
            borderWidth: 2,
            color: 'var(--text-0)',
            background: 'var(--bg-1)',
            fontSize: 11,
            padding: '8px 12px',
            width: 170,
          },
        };
      }),
    ];
  }, [inv?.graphNodes]);

  const edges: Edge[] = useMemo(() => {
    if (!inv?.graphEdges.length) return [];
    return inv.graphEdges.map((e, i) => {
      // find severity of target node to colour the edge
      const targetNode = inv.graphNodes.find(n => n.id === e.target);
      const sev = targetNode?.severity ?? 'low';
      const strokeColor = sev === 'high' ? '#e55' : sev === 'medium' ? '#c8922a' : 'var(--border-2)';
      return {
        id: `e${i}`,
        source: e.source,
        target: e.target,
        label: `${(e.similarity * 100).toFixed(0)}%`,
        labelStyle: { fontSize: 10, fill: strokeColor, fontWeight: 600 },
        labelBgStyle: { fill: 'var(--bg-0)', fillOpacity: 0.85 },
        markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
        style: { stroke: strokeColor, strokeWidth: sev === 'high' ? 2 : 1.5 },
      };
    });
  }, [inv?.graphEdges, inv?.graphNodes]);

  // ── No investigation found ────────────────────────────────────────────────

  if (!inv) {
    return (
      <div className="page">
        <div className="eyebrow">INVESTIGATION</div>
        <h1 className="page-title">No investigation</h1>
        <p className="page-desc">Start a new investigation from the intake form.</p>
        <button className="btn-primary" onClick={() => nav('/new')}>New investigation</button>
      </div>
    );
  }

  // ── Severity counts for badge row ─────────────────────────────────────────

  const highCount = inv.graphNodes.filter(n => n.severity === 'high').length;
  const medCount = inv.graphNodes.filter(n => n.severity === 'medium').length;
  const lowCount = inv.graphNodes.filter(n => n.severity === 'low' && n.id !== 'invention').length;

  const verdictCls = inv.verdict === 'green' ? 'badge-emerald' : inv.verdict === 'red' ? 'badge-rose' : 'badge-amber';

  return (
    <div className="page" style={{ maxWidth: 1280 }}>
      <div className="eyebrow">INVESTIGATION</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{inv.title}</h1>
        {inv.verdict && (
          <span className={`badge ${verdictCls}`} style={{ marginTop: 6 }}>
            {inv.verdict.toUpperCase()}
          </span>
        )}
      </div>
      <p className="page-desc">
        {inv.status === 'running'
          ? 'Live multi-agent pipeline. Updates stream as agents work.'
          : inv.orchestratorSummary ?? 'Pipeline complete.'}
      </p>

      <div className="two-col">
        {/* ── Agent cards ── */}
        <div>
          {inv.agents.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <AgentCard agent={a} />
            </motion.div>
          ))}

          {/* Go to editor button once complete */}
          {inv.status === 'complete' && inv.legalDraft && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => nav(`/editor/${inv.id}`)}>
                Open legal draft →
              </button>
            </motion.div>
          )}
        </div>

        {/* ── Patent graph ── */}
        <div>
          <div className="eyebrow">PATENT GRAPH</div>
          <div className="card" style={{ height: 520, padding: 0, overflow: 'hidden' }}>
            {nodes.length > 0 ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background color="rgba(255,255,255,0.04)" gap={20} />
                <Controls showInteractive={false} />
              </ReactFlow>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Waiting for Landscape agent...
              </div>
            )}
          </div>

          {(highCount > 0 || medCount > 0 || lowCount > 0) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {highCount > 0 && <span className="badge badge-rose">High · {highCount}</span>}
              {medCount > 0 && <span className="badge badge-amber">Medium · {medCount}</span>}
              {lowCount > 0 && <span className="badge badge-accent">Low · {lowCount}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
