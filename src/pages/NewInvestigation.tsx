import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getClarifyingQuestions, startInvestigation } from '../lib/api';
import { useAudtStore, makeAgents } from '../store/audtStore';
import { connectSSE } from '../lib/sse';
import { getConfiguredSources } from './Settings';

type Stage = 'form' | 'clarifying' | 'submitting';

export default function NewInvestigation() {
  const nav = useNavigate();
  const addInvestigation = useAudtStore(s => s.addInvestigation);
  const setCurrent = useAudtStore(s => s.setCurrent);

  const [stage, setStage] = useState<Stage>('form');
  const [form, setForm] = useState({ title: '', domain: '', description: '', context: '' });
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [error, setError] = useState('');

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStage('clarifying');
    try {
      const { questions: qs } = await getClarifyingQuestions(form);
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(''));
    } catch {
      setError('Could not reach the server. Is the Audt server running on port 3001?');
      setStage('form');
    }
  }

  async function handleAnswersSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStage('submitting');
    try {
      const configuredSources = getConfiguredSources()
        .filter(s => s.status === 'ready')
        .map(s => s.niaId ?? s.url);

      const { id } = await startInvestigation({
        ...form,
        answers: questions.map((q, i) => ({ question: q, answer: answers[i] })),
        sourceIdentifiers: configuredSources.length ? configuredSources : undefined,
      });

      // Create investigation in store immediately so Research page has data
      addInvestigation({
        id,
        title: form.title,
        domain: form.domain,
        description: form.description,
        context: form.context,
        agents: makeAgents(),
        graphNodes: [],
        graphEdges: [],
        claimScores: [],
        grants: [],
        status: 'running',
        createdAt: Date.now(),
      });

      setCurrent(id);
      connectSSE(id);
      nav(`/research/${id}`);
    } catch (err) {
      setError('Failed to start investigation. Check that the server is running.');
      setStage('clarifying');
    }
  }

  return (
    <div className="page">
      <div className="eyebrow">INTAKE</div>
      <h1 className="page-title">New investigation</h1>
      <p className="page-desc">Describe your invention. The agents will handle the rest.</p>

      {error && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--rose)', padding: '14px 20px' }}>
          <span style={{ color: 'var(--rose)', fontSize: 13 }}>{error}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {stage === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="card" style={{ padding: '28px 32px' }}>
              <form onSubmit={handleFormSubmit}>
                <div className="field">
                  <label className="field-label">Invention title</label>
                  <input
                    required
                    value={form.title}
                    onChange={e => update('title', e.target.value)}
                    placeholder="e.g. Adaptive thermal cloaking fabric"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Domain / industry</label>
                  <input
                    required
                    value={form.domain}
                    onChange={e => update('domain', e.target.value)}
                    placeholder="e.g. Advanced materials"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Describe your invention in detail</label>
                  <textarea
                    rows={8}
                    required
                    value={form.description}
                    onChange={e => update('description', e.target.value)}
                    placeholder="What it is, how it works, what problem it solves, what's novel about it..."
                  />
                </div>
                <div className="field">
                  <label className="field-label">Additional context (optional)</label>
                  <textarea
                    rows={3}
                    value={form.context}
                    onChange={e => update('context', e.target.value)}
                    placeholder="Prior art you're aware of, intended market, collaborators..."
                  />
                </div>
                <button type="submit" className="btn-primary">
                  Generate clarifying questions →
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {(stage === 'clarifying' || stage === 'submitting') && questions.length === 0 && (
          <motion.div
            key="loading-questions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card"
            style={{ padding: '40px 32px', textAlign: 'center' }}
          >
            <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
              Generating clarifying questions...
            </div>
          </motion.div>
        )}

        {stage === 'clarifying' && questions.length > 0 && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="card" style={{ padding: '28px 32px', marginBottom: 14 }}>
              <div className="stat-label" style={{ marginBottom: 16 }}>
                A few clarifying questions
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>
                Answering these will help the agents produce more accurate results. Skip any you prefer not to answer.
              </p>
              <form onSubmit={handleAnswersSubmit}>
                {questions.map((q, i) => (
                  <motion.div
                    key={i}
                    className="field"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <label className="field-label">{q}</label>
                    <textarea
                      rows={2}
                      value={answers[i]}
                      onChange={e => {
                        const next = [...answers];
                        next[i] = e.target.value;
                        setAnswers(next);
                      }}
                      placeholder="Your answer (optional)"
                    />
                  </motion.div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="submit" className="btn-primary">
                    Start investigation →
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setStage('form')}
                  >
                    ← Back
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {stage === 'submitting' && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card"
            style={{ padding: '40px 32px', textAlign: 'center' }}
          >
            <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
              Starting pipeline...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
