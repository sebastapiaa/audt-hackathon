# Audt — Claude Code context

You are working on Audt, a multi-agent patent research platform. The frontend shell is already scaffolded. Your job is to fill in the backend pipeline and wire it to the UI.

## Locked decisions (DO NOT CHANGE)

- **Dark mode only.** No light mode, no theme toggle.
- **English only.** No i18n, no language toggle.
- **Sidebar contains:** logo, navigation, user footer. Nothing else.
- **Design tokens** in `src/styles/globals.css` are locked. Use CSS variables, never raw hex.
- **Fonts:** Sora (headlines/stats), Plus Jakarta Sans (body/UI), JetBrains Mono (data/IDs).
- **Accent color:** `#3b6fca` (deep navy). Never neon. Never cyan.
- **Max content width:** 1120px. Page padding: 44px 52px.

Refer to `AUDT-DESIGN-SPEC.md` (in the project root) for the full design rationale before making UI changes.

## What's already done

- Vite + React 18 + TypeScript scaffold
- React Router with all 5 routes
- Sidebar with working active states
- All 5 pages stubbed with correct visual layout:
  - Dashboard (stat grid + recent table)
  - New Investigation (intake form)
  - Library (filterable table)
  - Research (two-column: agent cards + React Flow graph)
  - Editor (TipTap with functional toolbar)
  - Settings (tabbed: API Keys / Obsidian / Account / About)
- Zustand store scaffolded with `Investigation` and `Agent` types in `src/store/audtStore.ts`

## What you need to build

The backend architecture follows the original PriorAI plan: multi-agent pipeline with NIA primitives, contextScope enforcement, SSE streaming, React Flow knowledge graph driven by the Landscape agent, TipTap editor driven by the Legal Draft agent.

### Build order

1. **SSE client** (`src/lib/sse.ts`) — consumes backend event stream, dispatches to Zustand store
2. **NIA client** (`src/lib/nia.ts`) — wraps NIA primitives
3. **Agent pipeline** — Concept Extractor → Feasibility → Landscape + Grants (parallel) → Orchestrator → Legal Draft → Feedback
4. **Wire Zustand store** into Dashboard, Library, Research, Editor (currently all use hardcoded demo data)
5. **Clarifying-question flow** on New Investigation submit — generate questions inline with fade-in, then redirect to Research
6. **Obsidian sync** — on investigation complete, write markdown to configured vault path
7. **API key storage** — use Electron safeStorage if packaged as Electron, otherwise localStorage with warning

### Context scoping (important)

Each agent only sees the fields it needs. Do not pass the entire investigation object to every agent. Define per-agent input schemas.

### SSE event shape (suggested)

```ts
type AgentEvent =
  | { type: 'agent_start'; agentId: string }
  | { type: 'agent_update'; agentId: string; text: string }
  | { type: 'agent_complete'; agentId: string; summary: string; data: unknown }
  | { type: 'agent_failed'; agentId: string; error: string }
  | { type: 'graph_node'; node: { id: string; label: string; severity: 'high' | 'medium' | 'low' } }
  | { type: 'graph_edge'; edge: { source: string; target: string; similarity: number } };
```

## Style rules for new components

- Always start a page with `.eyebrow` → `.page-title` → `.page-desc`
- Use `.card` for any contained UI block
- Use `.btn-primary` / `.btn-ghost` — don't invent new button styles
- Verdict/status/tag pills use `.badge badge-{emerald|amber|rose|accent}`
- Status dots use `.status-dot dot-{pending|running|complete|failed}`
- Data values (patent IDs, scores, dates) use the `.mono` class
- Agent card "active" state: set `borderColor: var(--accent-b)` — no glow, no pulse flashing

## Animations (Framer Motion)

- Page transitions: fade + 4px upward translate, 200ms
- Agent cards appearing: fade + 8px upward translate, stagger 100ms
- Stat numbers counting up: 1200ms ease-out
- React Flow nodes spreading from center on first render: spring physics
- **Never**: bouncy animations, color flashing, glow, particles, loading spinners (use thin progress bar instead)
