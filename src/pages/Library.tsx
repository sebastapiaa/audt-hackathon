import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function Library() {
  const nav = useNavigate();
  const investigations = useAudtStore(s => s.investigations);

  const [query, setQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'complete' | 'failed'>('all');

  const filtered = investigations.filter(inv => {
    if (query && !inv.title.toLowerCase().includes(query.toLowerCase()) && !inv.domain.toLowerCase().includes(query.toLowerCase())) return false;
    if (verdictFilter !== 'all' && inv.verdict !== verdictFilter) return false;
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    return true;
  });

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const verdictLabel = verdictFilter === 'all' ? 'All verdicts' : verdictFilter.charAt(0).toUpperCase() + verdictFilter.slice(1);
  const statusLabel = statusFilter === 'all' ? 'All status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);

  return (
    <div className="page">
      <div className="eyebrow">LIBRARY</div>
      <h1 className="page-title">Investigations</h1>
      <p className="page-desc">Every patent research run you've conducted.</p>

      <div className="actions-row">
        <input
          placeholder="Filter by title or domain..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <div style={{ position: 'relative' }}>
          <select
            className="btn-ghost"
            value={verdictFilter}
            onChange={e => setVerdictFilter(e.target.value as typeof verdictFilter)}
            style={{ appearance: 'none', cursor: 'pointer', paddingRight: 28 }}
          >
            <option value="all">All verdicts</option>
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="red">Red</option>
          </select>
        </div>
        <div style={{ position: 'relative' }}>
          <select
            className="btn-ghost"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            style={{ appearance: 'none', cursor: 'pointer', paddingRight: 28 }}
          >
            <option value="all">All status</option>
            <option value="running">Running</option>
            <option value="complete">Complete</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '32px 28px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          {investigations.length === 0
            ? 'No investigations yet. Start one from New Investigation.'
            : 'No investigations match the current filters.'}
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
              {filtered.map(inv => (
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
