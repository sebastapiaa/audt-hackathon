import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { complete, parseJson } from './lib/claude.ts';
import { indexSource } from './lib/nia.ts';
import { startPipeline, pipelines, subscribe } from './pipeline.ts';
import type { InvestigationInput } from './types.ts';

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '2mb' }));

// ── Clarifying questions ──────────────────────────────────────────────────────
app.post('/api/clarify', async (req, res) => {
  try {
    const { title, domain, description, context } = req.body as InvestigationInput;

    const prompt = `Generate 4 clarifying questions for a patent investigation.

INVENTION TITLE: ${title}
DOMAIN: ${domain}
DESCRIPTION: ${description}${context ? `\nCONTEXT: ${context}` : ''}

Questions should uncover:
1. Specific technical components or materials central to the invention
2. What existing solutions this improves upon (prior art awareness)
3. Intended commercial applications and target markets
4. Key technical differentiators not captured in the description

Return JSON only: { "questions": ["string", "string", "string", "string"] }
Generate exactly 4 questions. Make them specific to this invention, not generic.`;

    const raw = await complete(prompt, 'You are a patent research intake specialist. Return only valid JSON.');
    const parsed = parseJson<{ questions: string[] }>(raw);
    res.json(parsed);
  } catch (err) {
    console.error('/api/clarify error:', err);
    res.json({
      questions: [
        'What specific materials, components, or mechanisms are central to how your invention works?',
        'What existing products or patents does your invention improve upon or replace?',
        'What is the primary commercial application or target industry for this invention?',
        'What is the single most novel aspect that distinguishes this from anything currently available?',
      ],
    });
  }
});

// ── Start investigation ───────────────────────────────────────────────────────
app.post('/api/investigate', async (req, res) => {
  try {
    const input = req.body as InvestigationInput;
    if (!input.title || !input.description) {
      return res.status(400).json({ error: 'title and description are required' });
    }
    const id = await startPipeline(input);
    res.json({ id });
  } catch (err) {
    console.error('/api/investigate error:', err);
    res.status(500).json({ error: 'Failed to start investigation' });
  }
});

// ── SSE stream ────────────────────────────────────────────────────────────────
app.get('/api/investigate/:id/stream', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const state = pipelines.get(id);
  if (!state) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Investigation not found' })}\n\n`);
    res.end();
    return;
  }

  // If pipeline already complete, replay final state
  if (state.status === 'complete' && state.orchestrator) {
    res.write(`data: ${JSON.stringify({ type: 'pipeline_complete', verdict: state.orchestrator.verdict, summary: state.orchestrator.summary })}\n\n`);
    res.end();
    return;
  }

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);

  const unsub = subscribe(id, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    // End stream naturally after pipeline completes
    if (event.type === 'pipeline_complete') {
      clearInterval(keepAlive);
      unsub();
      setTimeout(() => res.end(), 500);
    }
  });

  req.on('close', () => {
    clearInterval(keepAlive);
    unsub();
  });
});

// ── Index a Nia source ────────────────────────────────────────────────────────
app.post('/api/sources/index', async (req, res) => {
  try {
    const { url } = req.body as { url: string };
    if (!url) return res.status(400).json({ error: 'url is required' });
    const niaId = await indexSource(url);
    res.json({ niaId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('/api/sources/index error:', msg);
    res.status(500).json({ error: msg });
  }
});

// ── Get investigation (for page refresh / reconnect) ─────────────────────────
app.get('/api/investigate/:id', (req, res) => {
  const state = pipelines.get(req.params.id);
  if (!state) return res.status(404).json({ error: 'Not found' });
  res.json(state);
});

// ── List all investigations ───────────────────────────────────────────────────
app.get('/api/investigations', (_req, res) => {
  const list = Array.from(pipelines.values()).map(s => ({
    id: s.invId,
    title: s.input.title,
    domain: s.input.domain,
    status: s.status,
    verdict: s.orchestrator?.verdict ?? null,
    createdAt: s.createdAt,
  }));
  res.json(list.sort((a, b) => b.createdAt - a.createdAt));
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`\n  Audt server running at http://localhost:${PORT}\n`);
});
