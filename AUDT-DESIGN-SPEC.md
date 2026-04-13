# Audt — Frontend Design Spec
## Built on the ModTech aesthetic, adapted for a multi-agent patent research platform

---

## What is Audt

Audt (formerly PriorAI) is a multi-agent orchestration platform that takes a patent invention description and runs it through a pipeline of AI agents — Concept Extractor → Feasibility → Landscape + Grants (parallel) → Orchestrator → Legal Draft → Feedback. The output is a real-time research investigation: feasibility verdict, related patents in a knowledge graph, available grants, and a draft legal brief.

The architecture is multi-agent with strict context scoping. Each agent only sees the fields it needs. Live SSE streams agent progress. React Flow renders a knowledge graph as patents are discovered. The product is technical, premium, "Bloomberg Terminal meets Linear."

This document specs the **frontend visual system** only. Backend agent architecture, NIA primitive usage, and pipeline logic stay the same as the original PriorAI plan. We're just rewriting the UI layer to look like a mature, sophisticated product instead of a hackathon submission.

---

## Design Principles (from ModTech)

1. **Centered, spacious layouts** — never wall-to-wall content. Pages have generous side margins (~52px) and a max content width (~1120px).
2. **Tight, editorial typography** — Sora for headlines with -0.04em letter-spacing. Big, confident numbers.
3. **Calm, professional palette** — deep navy accent, never neon. Semantic colors used sparingly.
4. **Cards with restraint** — 14px border radius, 1px subtle borders, minimal shadows. No glassmorphism, no gradients on backgrounds.
5. **Monoline, functional iconography** — geometric shapes (◈ ⬡ ▤ ◧ ⚙), not filled illustrations.
6. **Eyebrow labels** — every page starts with a tiny uppercase label above the headline. It anchors the user.
7. **Hover states are quiet** — borders brighten, text shifts, buttons lift 1px. Nothing flashes.
8. **Typography hierarchy does the work** — not color, not shadows, not icons.

---

## Locked Decisions

- **English only.** No i18n system. No language toggle. All UI strings are hardcoded English.
- **Dark mode only.** No theme toggle. No light mode CSS. Single theme.
- **No sidebar language/theme controls.** Sidebar contains: logo, navigation, user info. That's it.

---

## Brand

- **Name:** Audt
- **Wordmark:** "Au**dt**" — the "dt" is the accent color
- **Logo mark:** 28x28px square with rounded corners (7px radius), navy gradient background, white "A" letter, font-weight 800, Sora, letter-spacing -0.03em
- **Tagline (optional):** "Patent intelligence, in real time."

---

## Typography

```css
/* Fonts to load */
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

**Headlines / page titles / stat numbers:** Sora
- Page titles: `font: 700 30px 'Sora'; letter-spacing: -0.04em; line-height: 1.2`
- Stat numbers: `font: 800 30px 'Sora'; letter-spacing: -0.04em; line-height: 1`
- Section titles: `font: 700 14px 'Sora'; letter-spacing: -0.02em`
- Card titles: `font: 600 13-15px 'Sora'; letter-spacing: -0.02em`

**Body / labels / buttons / inputs:** Plus Jakarta Sans
- Body text: `font: 400-500 13.5-14.5px 'Plus Jakarta Sans'`
- Eyebrow labels: `font: 600 11px; text-transform: uppercase; letter-spacing: 0.1em`
- Field labels: `font: 600 10.5px; text-transform: uppercase; letter-spacing: 0.08em`
- Buttons: `font: 600 13.5px 'Plus Jakarta Sans'; letter-spacing: -0.01em`

**Data / patent IDs / scores / code:** JetBrains Mono
- Patent IDs: `font: 500 12px 'JetBrains Mono'`
- Scores and metrics in tables: `font: 500 13px 'JetBrains Mono'`

---

## Color Tokens (Dark Only)

```css
:root {
  /* Backgrounds */
  --bg-0: #08090c;     /* page background */
  --bg-1: #0e1014;     /* card background */
  --bg-2: #14161c;     /* input background */
  --bg-3: #1b1d25;     /* hover background */
  --bg-4: #23252f;     /* elevated surface */
  --side-bg: #0b0c10;  /* sidebar */

  /* Text */
  --text-0: #edeef2;   /* primary headings & numbers */
  --text-1: #b8bac4;   /* body text */
  --text-2: #7d7f8c;   /* secondary text */
  --text-3: #535560;   /* tertiary / disabled */

  /* Accent — deep navy */
  --accent: #3b6fca;
  --accent-l: #6b9aef;
  --accent-dim: rgba(59, 111, 202, 0.08);
  --accent-b: rgba(59, 111, 202, 0.18);

  /* Semantic */
  --emerald: #3ecf8e;       /* success / green verdict */
  --emerald-dim: rgba(62, 207, 142, 0.08);
  --amber: #e2a336;         /* warning / yellow verdict */
  --amber-dim: rgba(226, 163, 54, 0.08);
  --rose: #f43f5e;          /* error / red verdict */
  --rose-dim: rgba(244, 63, 94, 0.08);

  /* Borders */
  --border-0: rgba(255, 255, 255, 0.04);
  --border-1: rgba(255, 255, 255, 0.07);
  --border-2: rgba(255, 255, 255, 0.12);

  /* Shadow */
  --shd: 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.03);
}
```

**Color usage rules:**
- Accent (navy) is the only "brand" color. Use it for primary buttons, active nav items, key data points, focus states, and the logo.
- Emerald, amber, and rose are reserved for **verdict states** only (feasibility result, conflict severity, status indicators). Never decorative.
- Backgrounds layer from `--bg-0` (page) → `--bg-1` (cards) → `--bg-2` (inputs) → `--bg-3` (hover). Never go beyond bg-4.
- Text always uses one of the four text tokens. Never raw hex colors in components.

---

## Layout System

### App Shell
```
┌────────────────────────────────────────────────┐
│ Sidebar (240px) │  Main content (flex: 1)      │
│                 │                                │
│  Logo           │  Page padding: 44px 52px      │
│  Nav items      │  Max content width: 1120px    │
│                 │                                │
│  User footer    │                                │
└────────────────────────────────────────────────┘
```

- App container: `display: flex; height: 100vh; overflow: hidden`
- Main: `flex: 1; overflow: auto; background: var(--bg-0)`
- Page wrapper: `padding: 44px 52px; max-width: 1120px`

### Page Structure
Every page follows this structure:

```jsx
<div className="page">
  <div className="eyebrow">RESEARCH</div>
  <h1 className="page-title">Investigation</h1>
  <p className="page-desc">Run a multi-agent patent research pipeline on your invention.</p>
  
  {/* page content here, with margin-bottom: 36px after the description */}
</div>
```

### Sidebar
- Width: 240px
- Background: `var(--side-bg)`
- Border-right: `1px solid var(--border-0)`
- Header: 64px tall, padding 0 24px, gap 10px between logo mark and wordmark
- Nav items: padding 10px 14px, border-radius 10px, gap 11px between icon and label
- Footer: padding 18px 24px, border-top, contains user avatar + name + role + sign out

---

## Components

### Eyebrow Label
```css
.eyebrow {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent-l);
  margin-bottom: 8px;
}
```

### Page Title
```css
.page-title {
  font: 700 30px 'Sora', sans-serif;
  letter-spacing: -0.04em;
  line-height: 1.2;
  margin-bottom: 4px;
}
```

### Page Description
```css
.page-desc {
  color: var(--text-2);
  font-size: 14.5px;
  margin-bottom: 36px;
}
```

### Cards
```css
.card {
  background: var(--bg-1);
  border: 1px solid var(--border-0);
  border-radius: 14px;
  padding: 22px 24px;
  box-shadow: var(--shd);
  transition: border-color 150ms;
}
.card:hover {
  border-color: var(--border-2);
}
```

### Stat Card (for dashboard / feasibility verdict)
```css
.stat-card {
  /* extends .card */
}
.stat-label {
  font-size: 11px;
  color: var(--text-3);
  margin-bottom: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.stat-value {
  font: 800 30px 'Sora', sans-serif;
  letter-spacing: -0.04em;
  line-height: 1;
  margin-bottom: 3px;
}
.stat-change {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 500;
}
```

### Buttons
```css
/* Primary button — gradient navy */
.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-l));
  color: #fff;
  padding: 11px 24px;
  border-radius: 10px;
  font: 600 13.5px 'Plus Jakarta Sans';
  letter-spacing: -0.01em;
  border: none;
  cursor: pointer;
  transition: all 150ms;
  box-shadow: 0 1px 4px rgba(59, 111, 202, 0.2);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(59, 111, 202, 0.3);
}

/* Ghost button — outline */
.btn-ghost {
  background: transparent;
  color: var(--text-2);
  padding: 11px 24px;
  border-radius: 10px;
  font: 500 13.5px 'Plus Jakarta Sans';
  border: 1px solid var(--border-1);
  cursor: pointer;
  transition: all 150ms;
}
.btn-ghost:hover {
  border-color: var(--border-2);
  color: var(--text-1);
}
```

### Inputs
```css
input, select, textarea {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: var(--bg-2);
  border: 1px solid var(--border-1);
  color: var(--text-0);
  border-radius: 9px;
  padding: 10px 14px;
  font-size: 13.5px;
  font-weight: 500;
  outline: none;
  width: 100%;
  transition: border-color 150ms;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--accent);
}
```

### Field Labels
```css
.field-label {
  display: block;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-3);
  margin-bottom: 7px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

### Badges (for verdicts, statuses, patent tags)
```css
.badge {
  padding: 4px 11px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.badge-accent {
  background: var(--accent-dim);
  color: var(--accent-l);
  border: 1px solid var(--accent-b);
}
.badge-emerald {
  background: var(--emerald-dim);
  color: var(--emerald);
  border: 1px solid rgba(62, 207, 142, 0.15);
}
.badge-amber {
  background: var(--amber-dim);
  color: var(--amber);
  border: 1px solid rgba(226, 163, 54, 0.15);
}
.badge-rose {
  background: var(--rose-dim);
  color: var(--rose);
  border: 1px solid rgba(244, 63, 94, 0.15);
}
```

### Status Dots
```css
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 7px;
}
/* Use with var(--emerald), var(--amber), var(--rose), var(--text-3) */
```

### Tables
```css
.table-wrap {
  background: var(--bg-1);
  border: 1px solid var(--border-0);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shd);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
thead tr {
  border-bottom: 1px solid var(--border-0);
}
th {
  padding: 13px 22px;
  text-align: left;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
td {
  padding: 15px 22px;
}
tbody tr {
  border-bottom: 1px solid var(--border-0);
  cursor: pointer;
  transition: background 120ms;
}
tbody tr:hover {
  background: var(--bg-2);
}
tbody tr:last-child {
  border-bottom: none;
}
```

### Sidebar Nav Item
```css
.nav-btn {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-2);
  font: 500 13.5px 'Plus Jakarta Sans';
  cursor: pointer;
  text-align: left;
  margin-bottom: 1px;
  transition: all 120ms;
}
.nav-btn:hover {
  background: var(--bg-3);
  color: var(--text-1);
}
.nav-btn.active {
  background: var(--accent-dim);
  color: var(--accent-l);
  border-color: var(--accent-b);
}
.nav-icon {
  font-size: 15px;
  width: 18px;
  text-align: center;
  opacity: 0.7;
}
.nav-btn.active .nav-icon {
  opacity: 1;
}
```

### Scrollbar
```css
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }
```

---

## Pages (Audt Specific)

The original PriorAI plan has 4 page concepts: Landing, Intake, Research, Draft. For Audt, restructure as a logged-in app with sidebar navigation:

### Sidebar Navigation
1. **Dashboard** (icon: ⬡) — overview of past investigations
2. **New Investigation** (icon: ◈) — intake form to start a new patent research run
3. **Library** (icon: ▤) — past investigations, filterable
4. **Editor** (icon: ◧) — TipTap-based legal draft editor for the current investigation
5. **Settings** (icon: ⚙) — API keys, Obsidian vault path, account info

### Page 1: Dashboard
- Eyebrow: "OVERVIEW"
- Title: "Welcome back"
- Description: "Your patent research investigations and recent activity."
- 4-column stat grid:
  - Total investigations (number)
  - Active pipelines (number)
  - Patents analyzed (number)
  - Drafts generated (number)
- Quick action buttons: "New investigation" (primary), "View library" (ghost)
- Recent investigations table: Title | Domain | Verdict (badge) | Status | Date

### Page 2: New Investigation (Intake)
- Eyebrow: "INTAKE"
- Title: "New investigation"
- Description: "Describe your invention. The agents will handle the rest."
- Single column form:
  - Field: "Invention title" (text input)
  - Field: "Domain / industry" (text input)
  - Field: "Describe your invention in detail" (large textarea, 8 rows)
  - Field: "Additional context (optional)" (textarea, 3 rows)
- Primary button: "Start investigation"
- After submit → AI generates clarifying questions inline (one by one with subtle fade-in, no blinking cursor needed)
- After questions answered → redirect to Research page

### Page 3: Research (Live Pipeline View)
This is the main event. Two-column layout:

**Left column (60%):** Live agent progress
- Eyebrow: "INVESTIGATION"
- Title: "{invention title}"
- Each agent gets a card showing:
  - Agent name + status dot (gray=pending, amber=running, emerald=complete, rose=failed)
  - Live SSE updates streaming as text
  - When complete: a summary metric (e.g., "Feasibility: 72/100 — YELLOW")
- Cards stack vertically. Active card has a subtle border pulse (border-color animation, not glow).

**Right column (40%):** Knowledge graph
- Eyebrow: "PATENT GRAPH"
- React Flow canvas inside a card
- Nodes and edges use the design tokens above (no neon colors)
- Center node (invention): rounded rectangle, navy border, larger
- Patent nodes: rounded rectangle, conflict severity = border thickness
- Edge labels in JetBrains Mono, 11px, text-2 color
- Below the graph: filter chips for severity (high/medium/low), each is a badge

### Page 4: Editor (Legal Draft)
- Eyebrow: "DRAFT"
- Title: "Patent application draft"
- Description: "Review, edit, and export your generated legal draft."
- TipTap editor in a card, full-width
- Toolbar at top of card: text formatting buttons (ghost button style)
- Right side panel: section navigation + claim strength scores (each score in JetBrains Mono, badge-style)

### Page 5: Settings
- Eyebrow: "SETTINGS"
- Title: "Settings"
- Description: "Configure API keys, integrations, and your account."
- Tabbed interface (no underlines for inactive, accent-color underline for active):
  - **API Keys** — NIA, Anthropic, etc. (password-style inputs)
  - **Obsidian** — vault path, sync settings
  - **Account** — name, email
  - **About** — version info

---

## React Flow Styling

Override React Flow defaults to match the design system:

```css
.react-flow__node {
  background: var(--bg-1);
  border: 1px solid var(--border-1);
  border-radius: 10px;
  padding: 12px 16px;
  font: 600 13px 'Sora', sans-serif;
  letter-spacing: -0.02em;
  color: var(--text-0);
  box-shadow: var(--shd);
}
.react-flow__node-inventionNode {
  border-color: var(--accent);
  border-width: 2px;
  background: var(--accent-dim);
}
.react-flow__node-patentNode-high {
  border-color: var(--rose);
}
.react-flow__node-patentNode-medium {
  border-color: var(--amber);
}
.react-flow__node-patentNode-low {
  border-color: var(--text-3);
}
.react-flow__edge-path {
  stroke: var(--border-2);
  stroke-width: 1.5;
}
.react-flow__edge-text {
  font: 500 11px 'JetBrains Mono', monospace;
  fill: var(--text-2);
}
.react-flow__background {
  background: var(--bg-0);
}
.react-flow__background-pattern {
  color: var(--border-0);
}
```

---

## Animation Guidelines

Use Framer Motion for:
- Page transitions (subtle fade + 4px upward translate, 200ms)
- Agent cards appearing (fade + 8px upward translate, stagger 100ms)
- Stat numbers counting up (1200ms, ease-out)
- React Flow nodes spreading from center on first render (spring physics)

**Don't** use:
- Bouncy animations
- Color flashing
- Glow effects
- Particle effects
- Loading spinners — use a thin progress bar at the top of cards instead

---

## What to Tell Claude Code (when starting Audt)

```
I'm building Audt, a multi-agent patent research platform. The backend architecture follows the original PriorAI plan exactly (multi-agent pipeline with NIA, contextScope, SSE streaming, React Flow knowledge graph, TipTap editor).

For the FRONTEND, ignore the design system from the PriorAI plan. Use this AUDT-DESIGN-SPEC.md instead. It defines:
- Sora headlines + Plus Jakarta Sans body + JetBrains Mono for data
- Deep navy accent (#3b6fca), dark mode only, English only
- Centered 1120px max-width pages with eyebrow labels
- Card-based components with subtle borders
- Specific CSS tokens for everything

Build the sidebar shell first, then Dashboard, then New Investigation, then the Research page (this is the main view), then Editor, then Settings. Match the spec exactly — fonts, spacing, colors, hover states.

Do NOT add light mode. Do NOT add language switching. Do NOT use the colors from the original PriorAI plan (#080d1a, #00d4ff, etc.). Use only the tokens defined in AUDT-DESIGN-SPEC.md.
```

---

## What stays the same as PriorAI

Everything backend: agents, NIA primitives, contextScope, SSE, Obsidian sync, Claude Code hand-off, Zustand store shape, project structure, build order, tests. The only things changing are the visual layer and the language/theme decisions (English only, dark only).
