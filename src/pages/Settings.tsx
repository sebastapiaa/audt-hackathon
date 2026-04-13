import { useState } from 'react';
import { indexNiaSource } from '../lib/api';

const TABS = ['API Keys', 'Sources', 'Obsidian', 'Account', 'About'] as const;
type Tab = (typeof TABS)[number];

const LS_NIA = 'audt_nia_key';
const LS_ANTHROPIC = 'audt_anthropic_key';
const LS_SOURCES = 'audt_sources';

export interface NiaSource {
  id: string;
  url: string;
  label: string;
  type: 'github' | 'url' | 'pdf';
  niaId?: string;
  status: 'pending' | 'indexing' | 'ready' | 'failed';
  addedAt: number;
}

function loadSources(): NiaSource[] {
  try { return JSON.parse(localStorage.getItem(LS_SOURCES) ?? '[]'); }
  catch { return []; }
}

function saveSources(sources: NiaSource[]) {
  localStorage.setItem(LS_SOURCES, JSON.stringify(sources));
}

function detectType(url: string): NiaSource['type'] {
  if (url.includes('github.com')) return 'github';
  if (url.endsWith('.pdf')) return 'pdf';
  return 'url';
}

function labelFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (u.hostname === 'github.com' && parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return u.hostname + (parts[0] ? `/${parts[0]}` : '');
  } catch { return url.slice(0, 50); }
}

const TYPE_ICON: Record<NiaSource['type'], string> = {
  github: '◈',
  url: '⬡',
  pdf: '▤',
};

const STATUS_COLOR: Record<NiaSource['status'], string> = {
  pending: 'var(--text-3)',
  indexing: 'var(--accent)',
  ready: 'var(--emerald)',
  failed: 'var(--rose)',
};

export function getConfiguredSources(): NiaSource[] {
  return loadSources();
}

export default function Settings() {
  const [tab, setTab] = useState<Tab>('API Keys');

  // API Keys state
  const [niaKey, setNiaKey] = useState(() => localStorage.getItem(LS_NIA) ?? '');
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem(LS_ANTHROPIC) ?? '');
  const [keysSaved, setKeysSaved] = useState(false);

  // Sources state
  const [sources, setSources] = useState<NiaSource[]>(loadSources);
  const [newUrl, setNewUrl] = useState('');
  const [indexingUrl, setIndexingUrl] = useState<string | null>(null);
  const [indexError, setIndexError] = useState('');

  function saveKeys() {
    localStorage.setItem(LS_NIA, niaKey);
    localStorage.setItem(LS_ANTHROPIC, anthropicKey);
    setKeysSaved(true);
    setTimeout(() => setKeysSaved(false), 2000);
  }

  async function addSource() {
    const url = newUrl.trim();
    if (!url) return;
    setIndexError('');

    const source: NiaSource = {
      id: crypto.randomUUID(),
      url,
      label: labelFromUrl(url),
      type: detectType(url),
      status: 'indexing',
      addedAt: Date.now(),
    };

    const updated = [...sources, source];
    setSources(updated);
    saveSources(updated);
    setNewUrl('');
    setIndexingUrl(source.id);

    try {
      const { niaId } = await indexNiaSource(url);
      const final = updated.map(s =>
        s.id === source.id ? { ...s, niaId, status: 'ready' as const } : s,
      );
      setSources(final);
      saveSources(final);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const failed = updated.map(s =>
        s.id === source.id ? { ...s, status: 'failed' as const } : s,
      );
      setSources(failed);
      saveSources(failed);
      setIndexError(`Failed to index: ${errMsg}`);
    } finally {
      setIndexingUrl(null);
    }
  }

  function removeSource(id: string) {
    const updated = sources.filter(s => s.id !== id);
    setSources(updated);
    saveSources(updated);
  }

  return (
    <div className="page">
      <div className="eyebrow">SETTINGS</div>
      <h1 className="page-title">Settings</h1>
      <p className="page-desc">Configure API keys, research sources, and integrations.</p>

      <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid var(--border-0)', marginBottom: 28 }}>
        {TABS.map(t => {
          const active = t === tab;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '12px 0',
                fontSize: 13.5,
                fontWeight: 600,
                color: active ? 'var(--accent-l)' : 'var(--text-2)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {tab === 'API Keys' && (
        <div style={{ maxWidth: 640 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="field">
              <label className="field-label">NIA API Key</label>
              <input
                type="password"
                placeholder="nia_..."
                value={niaKey}
                onChange={e => setNiaKey(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Anthropic API Key</label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={e => setAnthropicKey(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={saveKeys}>
              {keysSaved ? 'Saved ✓' : 'Save to localStorage'}
            </button>
          </div>
          <div className="card" style={{ borderColor: 'var(--accent-b)', padding: '16px 20px' }}>
            <div className="stat-label" style={{ marginBottom: 10 }}>Server configuration</div>
            <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
              The agent pipeline reads keys from a <span className="mono">.env</span> file in the project root.
              Copy <span className="mono">.env.example → .env</span> and add your keys, then restart <span className="mono">npm run server</span>.
            </p>
          </div>
        </div>
      )}

      {tab === 'Sources' && (
        <div style={{ maxWidth: 720 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="stat-label" style={{ marginBottom: 14 }}>Add a source</div>
            <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
              Add GitHub repos, documentation sites, or PDF URLs. Nia will index these sources
              and the research agents will scan them when running patent landscape analysis.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSource()}
                placeholder="https://github.com/owner/repo or https://docs.example.com"
                style={{ flex: 1 }}
                disabled={!!indexingUrl}
              />
              <button
                className="btn-primary"
                onClick={addSource}
                disabled={!newUrl.trim() || !!indexingUrl}
                style={{ whiteSpace: 'nowrap' }}
              >
                {indexingUrl ? 'Indexing...' : 'Add & Index'}
              </button>
            </div>
            {indexError && (
              <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 8 }}>{indexError}</p>
            )}
          </div>

          {sources.length === 0 ? (
            <div className="card" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              No sources configured. Add a GitHub repo or URL above to scope research.
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-0)' }}>
                <span className="stat-label">{sources.length} source{sources.length !== 1 ? 's' : ''} configured</span>
              </div>
              {sources.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 20px',
                    borderBottom: i < sources.length - 1 ? '1px solid var(--border-0)' : 'none',
                    gap: 12,
                  }}
                >
                  <span style={{ color: 'var(--accent)', fontSize: 14, width: 16 }}>{TYPE_ICON[s.type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-0)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.url}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: STATUS_COLOR[s.status] }}>
                      {s.status === 'indexing' ? '⟳ Indexing' : s.status}
                    </span>
                    {s.niaId && (
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                        {s.niaId.slice(0, 12)}…
                      </span>
                    )}
                    <button
                      className="btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => removeSource(s.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ marginTop: 14, borderColor: 'var(--accent-b)', padding: '14px 20px' }}>
            <div className="stat-label" style={{ marginBottom: 8 }}>Supported source types</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { icon: '◈', label: 'GitHub repos', note: 'github.com/owner/repo' },
                { icon: '⬡', label: 'Docs & websites', note: 'Any https:// URL' },
                { icon: '▤', label: 'PDF documents', note: 'Direct PDF links' },
              ].map(t => (
                <div key={t.label} style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--accent)', marginRight: 6 }}>{t.icon}</span>
                  <strong style={{ color: 'var(--text-1)' }}>{t.label}</strong>
                  <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>
                    {t.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Obsidian' && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="field">
            <label className="field-label">Vault path</label>
            <input placeholder="/Users/you/Obsidian/Audt" />
          </div>
          <div className="field">
            <label className="field-label">Sync mode</label>
            <select>
              <option>Auto-sync on investigation complete</option>
              <option>Manual sync only</option>
              <option>Disabled</option>
            </select>
          </div>
          <button className="btn-primary">Save</button>
        </div>
      )}

      {tab === 'Account' && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="field">
            <label className="field-label">Name</label>
            <input defaultValue="Seb Tapia" />
          </div>
          <div className="field">
            <label className="field-label">Email</label>
            <input defaultValue="seb@example.com" />
          </div>
          <button className="btn-primary">Update</button>
        </div>
      )}

      {tab === 'About' && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="stat-label">Version</div>
          <div style={{ fontSize: 14, color: 'var(--text-1)', marginBottom: 14 }}>Audt 0.1.0</div>
          <div className="stat-label">Build</div>
          <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>dev</div>
        </div>
      )}
    </div>
  );
}
