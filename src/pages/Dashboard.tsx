import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAudtStore } from '../store/audtStore';

function VerdictBadge({ v }: { v?: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    green: { cls: 'badge-emerald', label: 'GREEN' },
    yellow: { cls: 'badge-amber', label: 'YELLOW' },
    red: { cls: 'badge-rose', label: 'RED' },
  };
  if (!v) return <span className="badge badge-accent" style={{ opacity: 0.5 }}>—</span>;
  const { cls, label } = map[v] ?? map.green;
  return <span className={`badge ${cls}`}>{label}</span>;
}

function StatusDot({ s }: { s: string }) {
  const cls = s === 'complete' ? 'dot-complete' : s === 'failed' ? 'dot-failed' : 'dot-running';
  return <span className={`status-dot ${cls}`} style={{ marginRight: 6 }} />;
}

export default function Dashboard() {
  const nav = useNavigate();
  const investigations = useAudtStore(s => s.investigations);

  const total = investigations.length;
  const active = investigations.filter(i => i.status === 'running').length;
  const complete = investigations.filter(i => i.status === 'complete').length;
  const patentsAnalysed = investigations.reduce((sum, i) => sum + i.graphNodes.filter(n => n.id !== 'invention').length, 0);
  const drafts = investigations.filter(i => i.legalDraft).length;

  const stats = [
    { label: 'Total investigations', value: String(total), change: total > 0 ? `${complete} complete` : 'None yet' },
    { label: 'Active pipelines', value: String(active), change: active > 0 ? 'Running now' : 'None running' },
    { label: 'Patents analysed', value: patentsAnalysed > 0 ? patentsAnalysed.toLocaleString() : '—', change: patentsAnalysed > 0 ? 'Across all investigations' : 'Run an investigation' },
    { label: 'Drafts generated', value: String(drafts), change: drafts > 0 ? `${drafts} available in Editor` : 'None yet' },
  ];

  const recent = investigations.slice(0, 5);

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="page">
      <div className="eyebrow">OVERVIEW</div>
      <h1 className="page-title">Welcome back</h1>
      <p className="page-desc">Your patent research investigations and recent activity.</p>

      <div className="stat-grid">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="card"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change">{s.change}</div>
          </motion.div>
        ))}
      </div>

      <div className="actions-row">
        <button className="btn-primary" onClick={() => nav('/new')}>New investigation</button>
        <button className="btn-ghost" onClick={() => nav('/library')}>View library</button>
      </div>

      <h2 className="section-title">Recent investigations</h2>

      {recent.length === 0 ? (
        <div className="card" style={{ padding: '32px 28px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          No investigations yet.{' '}
          <button
            className="btn-ghost"
            style={{ display: 'inline', padding: '2px 8px', fontSize: 13 }}
            onClick={() => nav('/new')}
          >
            Start your first one →
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Domain</th>
                <th>Verdict</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(inv => (
                <tr key={inv.id} onClick={() => nav(`/research/${inv.id}`)}>
                  <td style={{ color: 'var(--text-0)', fontWeight: 500 }}>{inv.title}</td>
                  <td>{inv.domain}</td>
                  <td><VerdictBadge v={inv.verdict} /></td>
                  <td>
                    <StatusDot s={inv.status} />
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </td>
                  <td className="mono">{formatDate(inv.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
