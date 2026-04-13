# Audt

Multi-agent patent research platform. "Bloomberg Terminal meets Linear" for patent intelligence.

## Stack

- Vite + React 18 + TypeScript
- React Router for navigation
- Zustand for state
- React Flow for the knowledge graph
- TipTap for the legal draft editor
- Framer Motion for page/card transitions
- Dark mode only, English only (locked decisions per design spec)

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Project structure

```
src/
├── App.tsx              # Router + shell
├── main.tsx             # Entrypoint
├── components/
│   └── Sidebar.tsx      # 240px sidebar with logo, nav, user footer
├── pages/
│   ├── Dashboard.tsx         # Overview + stat grid + recent table
│   ├── NewInvestigation.tsx  # Intake form
│   ├── Library.tsx           # Past investigations table
│   ├── Research.tsx          # MAIN: live agent pipeline + knowledge graph
│   ├── Editor.tsx            # TipTap legal draft editor
│   └── Settings.tsx          # API keys, Obsidian, account, about
├── store/
│   └── audtStore.ts     # Zustand store (Investigation + Agent types)
├── lib/                 # (empty — add SSE client, NIA client, etc here)
└── styles/
    └── globals.css      # All design tokens + component classes
```

## Design system

All tokens live in `src/styles/globals.css`. See `AUDT-DESIGN-SPEC.md` for the full rationale. Key rules:

- **Colors**: only use CSS variables (`--bg-0`, `--text-1`, `--accent`, etc). Never raw hex in components.
- **Fonts**: Sora for headlines/stats, Plus Jakarta Sans for body/UI, JetBrains Mono for data/IDs/scores.
- **Max content width**: 1120px. Page padding: 44px 52px.
- **Every page** starts with `.eyebrow` → `.page-title` → `.page-desc`.
- **Semantic colors** (emerald/amber/rose) only for verdicts and status — never decorative.
- **Cards**: 14px radius, 1px subtle borders, hover brightens border only.

## What's stubbed vs real

**Real (working UI):**
- Sidebar navigation with active states
- All 5 pages render with correct design tokens
- Dashboard stat cards + recent investigations table
- New Investigation form (local state)
- Library filterable table (stub filter UI)
- Research page with live-styled agent cards + React Flow graph with 4 sample patents
- Editor with functional TipTap toolbar (bold, italic, h2, h3, lists)
- Settings tabs with forms

**Stubbed (for Claude Code to fill in):**
- Agent pipeline backend (NIA client, Concept Extractor → Feasibility → Landscape/Grants → Orchestrator → Legal Draft → Feedback)
- SSE streaming into agent cards
- Clarifying-question flow after intake submit
- Zustand store is scaffolded but not wired into any page yet
- Obsidian vault sync
- API key storage/encryption
- Claim strength scoring pipeline
- React Flow knowledge graph currently shows hardcoded nodes — needs to be driven by the Landscape agent's output

## Next steps (suggested order)

1. Wire `useAudtStore` into Dashboard + Library so they read real data
2. Build the SSE client in `src/lib/sse.ts` and stream updates into `Research.tsx`
3. Implement the agent pipeline (backend + frontend glue)
4. Replace Research page hardcoded graph with store-driven nodes
5. Hook Editor to store-selected investigation
6. Wire Settings to real persisted config
