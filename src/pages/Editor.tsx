import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useAudtStore } from '../store/audtStore';

type DocTab = 'feasibility' | 'dueDiligence' | 'legal';

const DOC_TABS: Array<{ key: DocTab; label: string; eyebrow: string }> = [
  { key: 'feasibility', label: 'Feasibility Report', eyebrow: 'FEASIBILITY' },
  { key: 'dueDiligence', label: 'Due Diligence', eyebrow: 'DUE DILIGENCE' },
  { key: 'legal', label: 'Legal Draft', eyebrow: 'PATENT APPLICATION' },
];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 0.75 ? 'var(--emerald)' : score >= 0.5 ? 'var(--amber)' : 'var(--rose)';
  return (
    <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${score * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>
  );
}

function StatusPill({ available }: { available: boolean }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: available ? 'var(--emerald)' : 'var(--text-3)',
      marginLeft: 6,
    }}>
      {available ? '●' : '○'}
    </span>
  );
}

export default function Editor() {
  const { id } = useParams<{ id?: string }>();
  const nav = useNavigate();

  const investigations = useAudtStore(s => s.investigations);
  const currentId = useAudtStore(s => s.currentId);

  const resolvedId = id ?? currentId ?? investigations[0]?.id;
  const inv = investigations.find(i => i.id === resolvedId);

  const [activeDoc, setActiveDoc] = useState<DocTab>('feasibility');

  const docMap: Record<DocTab, string | undefined> = {
    feasibility: inv?.feasibilityReport,
    dueDiligence: inv?.dueDiligenceReport,
    legal: inv?.legalDraft,
  };

  const currentHtml = docMap[activeDoc] ?? '';
  const placeholderText = inv?.status === 'running'
    ? '<p style="color:var(--text-3)">Waiting for agent to complete this document...</p>'
    : '<p style="color:var(--text-3)">No document generated yet. Complete an investigation first.</p>';

  const editor = useEditor({
    extensions: [StarterKit],
    content: currentHtml || placeholderText,
    editorProps: {
      attributes: { style: 'outline: none; min-height: 480px;' },
    },
  });

  // Swap editor content when tab changes or document arrives
  useEffect(() => {
    if (!editor) return;
    const html = docMap[activeDoc];
    const next = html || placeholderText;
    const current = editor.getHTML();
    if (current !== next) {
      editor.commands.setContent(next, false);
    }
  }, [activeDoc, inv?.feasibilityReport, inv?.dueDiligenceReport, inv?.legalDraft, editor]); // eslint-disable-line react-hooks/exhaustive-deps

  const slug = inv?.title.replace(/\s+/g, '-').toLowerCase() ?? 'document';

  function downloadHtml() {
    const html = docMap[activeDoc];
    if (!html) return;
    const full = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${inv?.title ?? 'Document'}</title>
<style>
  body { font-family: Georgia, serif; max-width: 860px; margin: 48px auto; padding: 0 32px; color: #111; line-height: 1.7; }
  h2 { font-size: 1.1rem; text-transform: uppercase; letter-spacing: .06em; margin-top: 2.4em; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
  h3 { font-size: 1rem; margin-top: 1.6em; }
  ol { padding-left: 1.4em; } li { margin-bottom: .6em; }
  @media print { body { margin: 24px; } }
</style>
</head><body>${html}</body></html>`;
    const blob = new Blob([full], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${activeDoc}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPdf() {
    const html = docMap[activeDoc];
    if (!html) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const docTitle = `${inv?.title ?? 'Document'} — ${DOC_TABS.find(t => t.key === activeDoc)?.label}`;
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${docTitle}</title>
<style>
  body { font-family: Georgia, serif; max-width: 860px; margin: 48px auto; padding: 0 32px; color: #111; line-height: 1.7; font-size: 14px; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.1rem; text-transform: uppercase; letter-spacing: .06em; margin-top: 2.4em; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
  h3 { font-size: 1rem; margin-top: 1.6em; }
  ol { padding-left: 1.4em; } li { margin-bottom: .6em; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; } td, th { border: 1px solid #ccc; padding: 8px 12px; }
  @media print { body { margin: 0; } @page { margin: 1.4cm 1.8cm; } }
  .print-btn { position: fixed; top: 16px; right: 16px; padding: 8px 18px; background: #3b6fca; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
  @media print { .print-btn { display: none; } }
</style>
</head><body>
<button class="print-btn" onclick="window.print()">Save as PDF</button>
${html}
<script>setTimeout(() => window.print(), 400);<\/script>
</body></html>`);
    win.document.close();
  }

  if (!inv) {
    return (
      <div className="page">
        <div className="eyebrow">REPORTS</div>
        <h1 className="page-title">No reports available</h1>
        <p className="page-desc">Complete an investigation to generate reports.</p>
        <button className="btn-primary" onClick={() => nav('/new')}>New investigation</button>
      </div>
    );
  }

  const claimScores = inv.claimScores ?? [];
  const grants = inv.grants ?? [];
  const currentTabMeta = DOC_TABS.find(t => t.key === activeDoc)!;

  return (
    <div className="page" style={{ maxWidth: 1280 }}>
      <div className="eyebrow">{currentTabMeta.eyebrow}</div>
      <h1 className="page-title">{inv.title}</h1>
      <p className="page-desc">
        {inv.status === 'running' ? 'Reports generate as agents complete.' : 'Review, edit, and export all generated documents.'}
      </p>

      {/* ── Document type tabs ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border-0)' }}>
        {DOC_TABS.map(t => {
          const available = !!docMap[t.key];
          const active = activeDoc === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveDoc(t.key)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '12px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: active ? 'var(--text-0)' : 'var(--text-2)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {t.label}
              <StatusPill available={available} />
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* ── Editor ── */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', gap: 6, padding: '14px 20px', borderBottom: '1px solid var(--border-0)' }}>
            <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
            <button className="btn-ghost" style={{ padding: '6px 12px', fontStyle: 'italic' }} onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
            <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
            <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
            <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
            <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>
            <div style={{ flex: 1 }} />
            {docMap[activeDoc] && (<>
              <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={downloadHtml}>
                Export HTML
              </button>
              <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={downloadPdf}>
                Download PDF
              </button>
            </>)}
          </div>
          <div style={{ padding: '28px 32px', minHeight: 520, color: 'var(--text-1)', fontSize: 14.5, lineHeight: 1.7 }}>
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div>
          {/* Claim strength — only on legal tab */}
          {activeDoc === 'legal' && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="stat-label">Claim strength</div>
              {claimScores.length === 0 ? (
                <div style={{ marginTop: 12, color: 'var(--text-3)', fontSize: 12 }}>
                  Awaiting Legal Draft agent...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  {claimScores.map(c => (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text-1)' }}>Claim {c.id}</span>
                        <span className="badge badge-accent mono">{c.score.toFixed(2)}</span>
                      </div>
                      <ScoreBar score={c.score} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overall verdict — on all tabs */}
          {inv.verdict && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="stat-label">Overall verdict</div>
              <div style={{ marginTop: 12 }}>
                <span className={`badge badge-${inv.verdict === 'green' ? 'emerald' : inv.verdict === 'red' ? 'rose' : 'amber'}`}>
                  {inv.verdict.toUpperCase()}
                </span>
              </div>
              {inv.orchestratorSummary && (
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 10, lineHeight: 1.6 }}>
                  {inv.orchestratorSummary.slice(0, 200)}
                </p>
              )}
            </div>
          )}

          {/* Documents status */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="stat-label">Documents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {DOC_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveDoc(t.key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: activeDoc === t.key ? 'var(--accent-l)' : 'var(--text-2)',
                  }}
                >
                  <span>{t.label}</span>
                  <span style={{ fontSize: 10, color: docMap[t.key] ? 'var(--emerald)' : 'var(--text-3)' }}>
                    {docMap[t.key] ? 'Ready' : inv?.status === 'running' ? 'Pending…' : 'N/A'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Funding — on all tabs */}
          {grants.length > 0 && (
            <div className="card">
              <div className="stat-label">Funding opportunities</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {grants.slice(0, 3).map((g, i) => (
                  <div key={i} style={{ fontSize: 12.5 }}>
                    <div style={{ color: 'var(--text-0)', fontWeight: 600 }}>{g.name}</div>
                    <div style={{ color: 'var(--text-3)' }}>{g.agency} · {g.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
