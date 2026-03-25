# UI Modern Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing warm-cream serif UI with a modern dark-first SaaS layout: sidebar navigation, light/dark theme toggle, and responsive mobile support.

**Architecture:** Three files change — `index.html` adds Google Fonts, `styles.css` is fully replaced with a CSS-variable token system supporting both themes, and `App.tsx` gains tab navigation state, theme persistence, and a new shell structure wrapping the existing section JSX. All existing form state, handlers, and API calls remain unchanged.

**Tech Stack:** React + TypeScript, CSS custom properties (no CSS-in-JS), localStorage for theme persistence, Google Fonts (Inter + JetBrains Mono).

---

## File Map

| File | Change |
|---|---|
| `apps/web/index.html` | Add Google Fonts preconnect + stylesheet |
| `apps/web/src/styles.css` | Full replacement — new tokens, shell layout, all component classes |
| `apps/web/src/App.tsx` | Add `activeTab` state, `theme` effect, shell chrome JSX, conditional section renders |

`CodeEditor.tsx`, `ReplayViewer.tsx`, and `api.ts` are **not touched**.

---

## Task 1: Add Google Fonts

**Files:**
- Modify: `apps/web/index.html`

- [ ] **Step 1: Open `apps/web/index.html`**

Current content (7 lines). Add two font preload links inside `<head>`, before `</head>`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PCRobots</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Verify fonts load**

Run: `npm run dev` in `apps/web/` (or from root if a workspace dev command exists).
Open browser DevTools → Network → filter by `fonts.googleapis.com`. Confirm `Inter` and `JetBrains+Mono` requests appear.

- [ ] **Step 3: Commit**

```bash
git add apps/web/index.html
git commit -m "feat: add Inter and JetBrains Mono via Google Fonts"
```

---

## Task 2: Replace styles.css

**Files:**
- Modify: `apps/web/src/styles.css` (full replacement)

This task replaces the entire file. The new CSS must:
- Define two complete token sets switched by `[data-theme]` on `<html>`
- Provide shell layout classes (sidebar, topbar, bottom-nav)
- Restyle all existing classes used in `App.tsx` and `ReplayViewer.tsx` (panel, form-grid, buttons, etc.)
- Add new classes for cards, stat chips, badges, and nav items
- Be responsive at 700px

- [ ] **Step 1: Replace `apps/web/src/styles.css` with the following**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Theme tokens ── */
:root,
[data-theme="dark"] {
  --bg:         #0f1117;
  --surface:    #161b27;
  --surface2:   #1e2535;
  --border:     rgba(255,255,255,0.08);
  --border2:    rgba(255,255,255,0.14);
  --accent:     #6366f1;
  --accent2:    #818cf8;
  --green:      #4ade80;
  --red:        #f87171;
  --amber:      #fbbf24;
  --blue:       #60a5fa;
  --text:       #f1f5f9;
  --text-dim:   #c8d4e8;
  --text-muted: #8b9db8;
  --shadow:     0 2px 8px rgba(0,0,0,0.4);
  --code-bg:    rgba(0,0,0,0.35);
  --code-border:rgba(255,255,255,0.08);
  --code-cm:    #7a8faa;
  --input-bg:   rgba(0,0,0,0.35);
  --chip-bg:    rgba(214,225,232,0.08);
  color-scheme: dark;
}

[data-theme="light"] {
  --bg:         #f4f6fb;
  --surface:    #ffffff;
  --surface2:   #eef1f8;
  --border:     rgba(0,0,0,0.08);
  --border2:    rgba(0,0,0,0.14);
  --accent:     #6366f1;
  --accent2:    #4f46e5;
  --green:      #16a34a;
  --red:        #dc2626;
  --amber:      #d97706;
  --blue:       #2563eb;
  --text:       #0f172a;
  --text-dim:   #334155;
  --text-muted: #64748b;
  --shadow:     0 2px 8px rgba(0,0,0,0.10);
  --code-bg:    #f8fafc;
  --code-border:rgba(0,0,0,0.08);
  --code-cm:    #64748b;
  --input-bg:   #ffffff;
  --chip-bg:    rgba(214,225,232,0.34);
  color-scheme: light;
}

/* ── Base ── */
html, body, #root {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 15px;
  -webkit-font-smoothing: antialiased;
  transition: background 0.2s, color 0.2s;
}

button, input, select {
  font: inherit;
}

/* ══════════════════════════════
   SHELL LAYOUT
══════════════════════════════ */
.shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ── Sidebar (desktop) ── */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  transition: background 0.2s, border-color 0.2s;
}

.sidebar-logo {
  padding: 0 20px 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}

.logo-lockup {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, var(--accent), #a855f7);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.logo-text {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}

.logo-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 1px;
}

.nav-section {
  padding: 0 12px;
  margin-bottom: 4px;
}

.nav-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: 8px 8px 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-dim);
  cursor: pointer;
  margin-bottom: 1px;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  transition: background 0.1s, color 0.1s;
}

.nav-item:hover { background: var(--surface2); }

.nav-item.active {
  background: rgba(99,102,241,0.15);
  color: var(--accent2);
  font-weight: 600;
}

.nav-icon {
  width: 18px;
  text-align: center;
  font-size: 16px;
  flex-shrink: 0;
}

.nav-badge {
  margin-left: auto;
  background: var(--surface2);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
}

.nav-item.active .nav-badge {
  background: rgba(99,102,241,0.25);
  color: var(--accent2);
}

.sidebar-footer {
  margin-top: auto;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  color: #fff;
}

.user-info { flex: 1; overflow: hidden; }
.user-name { font-size: 13px; font-weight: 600; color: var(--text); }
.user-role { font-size: 12px; color: var(--text-muted); margin-top: 1px; }

.theme-toggle {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  background: var(--surface2);
  border: 1px solid var(--border2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

/* ── Content wrap ── */
.content-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Top bar (mobile only) ── */
.topbar {
  display: none;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 56px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.topbar-logo {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1;
}

.topbar-logo .logo-icon { width: 28px; height: 28px; font-size: 15px; }
.topbar-logo .logo-text { font-size: 16px; }

/* ── Content area ── */
.content {
  flex: 1;
  overflow: auto;
  background: var(--bg);
  transition: background 0.2s;
}

.content-inner {
  padding: 32px 40px;
  max-width: 1200px;
}

/* ── Bottom nav (mobile only) ── */
.bottom-nav {
  display: none;
  background: var(--surface);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.bottom-nav-inner {
  display: flex;
  justify-content: space-around;
  padding: 8px 0 12px;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 16px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: none;
  border: none;
}

.bottom-nav-item .nav-icon { font-size: 20px; width: auto; }
.bottom-nav-item.active { color: var(--accent2); }

/* ══════════════════════════════
   PAGE CHROME
══════════════════════════════ */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.page-sub {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 5px;
  font-weight: 500;
}

/* Status row (refresh button + messages) */
.status-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* ══════════════════════════════
   STAT CHIPS
══════════════════════════════ */
.stat-row {
  display: flex;
  gap: 14px;
  margin-bottom: 24px;
}

.stat-chip {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 18px;
  flex: 1;
  transition: background 0.2s;
}

.stat-chip-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.stat-chip-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}

.stat-chip-delta {
  font-size: 12px;
  font-weight: 500;
  color: var(--green);
  margin-top: 3px;
}

/* ══════════════════════════════
   TABS
══════════════════════════════ */
.tab-row {
  display: flex;
  gap: 2px;
  margin-bottom: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 3px;
  width: fit-content;
  transition: background 0.2s;
}

.tab-pill {
  font-size: 13px;
  font-weight: 500;
  padding: 7px 16px;
  border-radius: 7px;
  cursor: pointer;
  color: var(--text-muted);
  background: none;
  border: none;
}

.tab-pill.active {
  background: var(--surface2);
  color: var(--text);
  font-weight: 600;
  box-shadow: var(--shadow);
}

/* ══════════════════════════════
   LAYOUT HELPERS
══════════════════════════════ */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.stack-column {
  display: grid;
  gap: 18px;
}

/* ══════════════════════════════
   PANELS / CARDS
══════════════════════════════ */
.panel,
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 22px;
  margin-bottom: 16px;
  transition: background 0.2s, border-color 0.2s;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  margin-bottom: 16px;
}

.panel-header h2 { margin: 0; font-size: 18px; letter-spacing: -0.01em; }

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.01em;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* ══════════════════════════════
   FORMS
══════════════════════════════ */
.form-grid {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.two-up { grid-template-columns: repeat(2, minmax(0,1fr)); }
.three-up { grid-template-columns: repeat(3, minmax(0,1fr)); }

label {
  display: grid;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

input,
select {
  width: 100%;
  padding: 10px 13px;
  border-radius: 7px;
  border: 1px solid var(--border2);
  background: var(--input-bg);
  color: var(--text);
  font-size: 14px;
  transition: background 0.2s, border-color 0.2s;
}

.checkbox-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
}

.checkbox-row input {
  width: 20px;
  height: 20px;
}

/* ══════════════════════════════
   BUTTONS
══════════════════════════════ */
.primary-button {
  background: var(--accent);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: opacity 0.15s;
}

.primary-button:disabled { opacity: 0.55; cursor: not-allowed; }

.ghost-button {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 9px 16px;
  color: var(--text-dim);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.1s;
}

.ghost-button:hover { background: var(--border2); }
.ghost-button:disabled { opacity: 0.55; cursor: not-allowed; }

.small-button { padding: 7px 12px; font-size: 13px; }

.button-cluster {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ══════════════════════════════
   MESSAGES
══════════════════════════════ */
.message {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.message.success {
  background: rgba(74,222,128,0.12);
  color: var(--green);
}

.message.error {
  background: rgba(248,113,113,0.12);
  color: var(--red);
}

/* ══════════════════════════════
   CODE EDITOR WRAPPER
══════════════════════════════ */
.code-editor {
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--code-border);
  margin-bottom: 14px;
  background: var(--code-bg);
}

/* ══════════════════════════════
   LIST PANELS
══════════════════════════════ */
.list-panel { min-height: 200px; }

.scroll-list {
  display: grid;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
}

.compact-list { max-height: 320px; }
.competition-list { max-height: 360px; }

.list-card {
  padding: 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: border-color 0.1s;
}

.list-card h3 { margin: 0; font-size: 15px; letter-spacing: -0.01em; }
.list-card p { margin: 6px 0 0; color: var(--text-muted); font-size: 13px; }

.match-list-card {
  display: grid;
  gap: 5px;
  text-align: left;
  padding: 13px 15px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.1s, background 0.1s;
}

.match-list-card:hover { border-color: var(--border2); }

.match-list-card.active {
  background: rgba(99,102,241,0.10);
  border-color: rgba(99,102,241,0.35);
}

.match-title { font-weight: 600; color: var(--text); font-size: 14px; }
.match-meta  { font-size: 13px; color: var(--text-muted); }
.muted       { color: var(--text-muted); }

/* ══════════════════════════════
   STATUS PILLS / BADGES
══════════════════════════════ */
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--surface2);
  color: var(--text-muted);
}

.status-pill.subtle {
  background: rgba(99,102,241,0.12);
  color: var(--accent2);
}

.status-completed {
  background: rgba(74,222,128,0.12);
  color: var(--green);
}

.status-running,
.status-queued,
.status-pending {
  background: rgba(251,191,36,0.12);
  color: var(--amber);
}

.status-failed {
  background: rgba(248,113,113,0.12);
  color: var(--red);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.status-badge::before { content: '●'; font-size: 8px; }
.status-ok { background: rgba(74,222,128,0.12); color: var(--green); }

/* Language badges */
.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.badge-js  { background: rgba(251,191,36,0.15); color: #fbbf24; }
.badge-py  { background: rgba(74,222,128,0.15); color: #4ade80; }
.badge-ts  { background: rgba(96,165,250,0.15); color: #60a5fa; }

/* ══════════════════════════════
   REPLAY VIEWER
══════════════════════════════ */
.replay-panel { min-height: 500px; }

.replay-status-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.replay-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--text-muted);
}

.arena-stage {
  overflow: hidden;
  border-radius: 12px;
  background: var(--surface2);
  border: 1px solid var(--border);
}

.arena-stage svg {
  width: 100%;
  display: block;
  aspect-ratio: 1 / 1;
}

.timeline-controls {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
}

.timeline-controls input[type="range"] { padding: 0; }

.tick-badge { font-weight: 700; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }

.tick-events h3 { margin: 0 0 8px; font-size: 14px; color: var(--text-dim); }
.tick-events p  { color: var(--text-muted); font-size: 13px; }

.tick-events ul {
  margin: 10px 0 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--text-dim);
}

.empty-panel {
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--text-muted);
}

/* ══════════════════════════════
   COMPETITION (LADDERS / TOURNAMENTS)
══════════════════════════════ */
.card-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.standing-list {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 13px;
}

.standing-list li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  color: var(--text-dim);
}

.compact-standing-list { margin-top: 0; }

.round-summary-list { display: grid; gap: 6px; margin-top: 10px; }

.round-summary-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--chip-bg);
  font-size: 13px;
  color: var(--text-dim);
}

.round-summary-item small { color: var(--text-muted); }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 8px;
  margin: 10px 0;
}

.summary-chip {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--chip-bg);
}

.summary-chip strong { font-size: 15px; color: var(--text); }
.summary-chip small  { font-size: 12px; color: var(--text-muted); }

.leader-line { margin: 6px 0 10px; color: var(--text-muted); font-size: 13px; }

/* Bot checklist */
.bot-checklist {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 8px;
  margin: 8px 0 14px;
}

.bot-pill {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  font-size: 13px;
}

.bot-pill input { width: 16px; height: 16px; }
.bot-pill small { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 11px; }

/* ══════════════════════════════
   RESPONSIVE — mobile ≤ 700px
══════════════════════════════ */
@media (max-width: 700px) {
  .shell { flex-direction: column; height: 100dvh; overflow: hidden; }

  .sidebar    { display: none; }
  .topbar     { display: flex; }
  .bottom-nav { display: block; }

  .content { overflow: auto; }
  .content-inner { padding: 20px 16px 24px; }

  .stat-row { gap: 10px; }
  .stat-chip { padding: 12px 14px; }
  .stat-chip-value { font-size: 18px; }

  .page-header {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .two-col { grid-template-columns: 1fr; gap: 0; }

  .two-up,
  .three-up { grid-template-columns: 1fr; }

  .bot-checklist,
  .summary-grid { grid-template-columns: 1fr; }

  .timeline-controls { grid-template-columns: 1fr; }

  .tab-row { width: 100%; }
  .tab-pill { flex: 1; text-align: center; }

  .button-cluster { display: grid; justify-content: stretch; }
}

@media (max-width: 900px) {
  .bot-checklist { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Verify TypeScript still compiles**

Run from repo root:
```bash
npm run check
```
Expected: no new TypeScript errors (CSS changes don't affect types).

- [ ] **Step 3: Spot-check in browser**

Start dev server and verify:
- Dark background (`#0f1117`) renders
- No `Georgia` serif font anywhere — Inter sans-serif everywhere
- Buttons, inputs, panels have the new rounded look

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/styles.css
git commit -m "feat: replace styles.css with modern token-based design system"
```

---

## Task 3: Add shell chrome and theme toggle to App.tsx

**Files:**
- Modify: `apps/web/src/App.tsx`

Add `activeTab` state, theme effect, and the outer shell JSX (sidebar, topbar, bottom-nav). Do NOT yet move any existing section JSX — that comes in Task 4.

- [ ] **Step 1: Add imports and new state to `App()`**

At the top of the `App` function body, after the existing state declarations, add:

```tsx
type Tab = 'bots' | 'arenas' | 'matches' | 'compete';
const [activeTab, setActiveTab] = useState<Tab>('bots');
const [theme, setTheme] = useState<'dark' | 'light'>(() => {
  return (localStorage.getItem('pcrobots-theme') as 'dark' | 'light') ?? 'dark';
});

useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('pcrobots-theme', theme);
}, [theme]);

function toggleTheme() {
  setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
}
```

- [ ] **Step 2: Replace the return statement's outer shell**

Replace `<main className="app-shell">` ... `</main>` with a new outer shell that wraps the existing content. Keep ALL existing inner section JSX intact for now — just change the wrapper:

```tsx
return (
  <div className="shell">
    {/* ── Desktop Sidebar ── */}
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-lockup">
          <div className="logo-icon">⚡</div>
          <div>
            <div className="logo-text">PCRobots</div>
            <div className="logo-sub">Ops Deck</div>
          </div>
        </div>
      </div>
      <div className="nav-section">
        <div className="nav-section-label">Workspace</div>
        <button className={`nav-item${activeTab === 'bots' ? ' active' : ''}`} onClick={() => setActiveTab('bots')}>
          <span className="nav-icon">🤖</span> Bots
          <span className="nav-badge">{bots.length}</span>
        </button>
        <button className={`nav-item${activeTab === 'arenas' ? ' active' : ''}`} onClick={() => setActiveTab('arenas')}>
          <span className="nav-icon">🗺</span> Arenas
          <span className="nav-badge">{arenas.length}</span>
        </button>
        <button className={`nav-item${activeTab === 'matches' ? ' active' : ''}`} onClick={() => setActiveTab('matches')}>
          <span className="nav-icon">▶</span> Matches
          <span className="nav-badge">{matches.length}</span>
        </button>
        <button className={`nav-item${activeTab === 'compete' ? ' active' : ''}`} onClick={() => setActiveTab('compete')}>
          <span className="nav-icon">⚔</span> Compete
          <span className="nav-badge">{ladders.length + tournaments.length}</span>
        </button>
      </div>
      <div className="sidebar-footer">
        <div className="avatar">P</div>
        <div className="user-info">
          <div className="user-name">PCRobots</div>
          <div className="user-role">Ops Deck</div>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>

    {/* ── Content Wrap ── */}
    <div className="content-wrap">
      {/* Mobile top bar */}
      <div className="topbar">
        <div className="topbar-logo">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">PCRobots</div>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Main content — existing sections temporarily inlined here */}
      <main className="content">
        <div className="content-inner">
          <div className="status-row">
            <button className="ghost-button" type="button" onClick={() => void refreshData()} disabled={loading || submitting}>
              {loading ? 'Refreshing...' : 'Refresh data'}
            </button>
            {message ? <span className="message success">{message}</span> : null}
            {error ? <span className="message error">{error}</span> : null}
          </div>

          {/* TEMPORARY: render all sections so nothing breaks yet */}
          {/* Task 4 will replace this with conditional tab renders */}
          <p style={{color:'var(--text-muted)',fontSize:13}}>Tab: {activeTab} — sections below (Task 4 splits these)</p>

          <div className="stack-column">
            {/* All existing section JSX from the old dashboard-grid goes here temporarily */}
            {/* Copy the three stack-column divs from the original return */}
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <button className={`bottom-nav-item${activeTab === 'bots' ? ' active' : ''}`} onClick={() => setActiveTab('bots')}>
            <span className="nav-icon">🤖</span>Bots
          </button>
          <button className={`bottom-nav-item${activeTab === 'arenas' ? ' active' : ''}`} onClick={() => setActiveTab('arenas')}>
            <span className="nav-icon">🗺</span>Arenas
          </button>
          <button className={`bottom-nav-item${activeTab === 'matches' ? ' active' : ''}`} onClick={() => setActiveTab('matches')}>
            <span className="nav-icon">▶</span>Matches
          </button>
          <button className={`bottom-nav-item${activeTab === 'compete' ? ' active' : ''}`} onClick={() => setActiveTab('compete')}>
            <span className="nav-icon">⚔</span>Compete
          </button>
        </div>
      </nav>
    </div>
  </div>
);
```

> **Note:** In the "temporary" section, paste the full existing three-column section JSX verbatim from the original `<section className="dashboard-grid expanded-grid">` block. This keeps the app functional while the refactor is in progress.

- [ ] **Step 3: Run TypeScript check**

```bash
npm run check
```
Expected: passes with no errors. The `Tab` type and new state variables should satisfy TypeScript.

- [ ] **Step 4: Verify in browser**

- Sidebar appears on desktop (≥700px)
- Top bar + bottom nav appear on mobile (resize to 400px)
- Theme toggle switches between dark and light
- Refreshing the page preserves the selected theme (localStorage)
- All existing sections still render (temporarily all visible)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: add sidebar shell, theme toggle, and tab state to App"
```

---

## Task 4: Split App.tsx into four tab sections

**Files:**
- Modify: `apps/web/src/App.tsx`

Replace the temporary "all sections visible" block with four conditional renders. Each tab gets a `StatRow` and its relevant panels. Move existing JSX into the correct tab.

- [ ] **Step 1: Add a `StatRow` helper component near the top of the file (before `App()`)**

```tsx
function StatRow(props: { chips: Array<{ label: string; value: number | string }> }) {
  return (
    <div className="stat-row">
      {props.chips.map((chip) => (
        <div key={chip.label} className="stat-chip">
          <div className="stat-chip-label">{chip.label}</div>
          <div className="stat-chip-value">{chip.value}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace the temporary section block with four conditional renders**

Replace the temporary `<p>Tab: {activeTab}...` block and the `<div className="stack-column">` temporary wrapper with:

```tsx
{activeTab === 'bots' && (
  <div>
    <div className="page-header">
      <div>
        <div className="page-title">Bots</div>
        <div className="page-sub">Build and manage your robot fleet</div>
      </div>
    </div>
    <StatRow chips={[
      { label: 'Bots', value: bots.length },
      { label: 'Arenas', value: arenas.length },
      { label: 'Matches', value: matches.length },
    ]} />
    <div className="two-col">
      <div>
        {/* Bot creation panel — copy from original left stack-column */}
        <section className="panel" data-testid="bot-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Bot Lab</p>
              <h2>Create Bot</h2>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => setBotForm((current) => ({ ...current, source: defaultBotTemplates[current.language] }))}
            >
              Load template
            </button>
          </div>
          <div className="form-grid two-up">
            <label>
              <span>Name</span>
              <input value={botForm.name} onChange={(event) => setBotForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Language</span>
              <select
                value={botForm.language}
                onChange={(event) => {
                  const language = event.target.value as SupportedLanguage;
                  setBotForm((current) => ({ ...current, language, source: defaultBotTemplates[language] }));
                }}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
              </select>
            </label>
          </div>
          <label>
            <span>Description</span>
            <input value={botForm.description} onChange={(event) => setBotForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <CodeEditor language={botForm.language} value={botForm.source} height={300} onChange={(value) => setBotForm((current) => ({ ...current, source: value }))} />
          <button className="primary-button" type="button" onClick={() => void handleCreateBot()} disabled={submitting}>
            Save bot revision
          </button>
        </section>
      </div>
      <div>
        {/* Bot catalog — copy from original right stack-column */}
        <section className="panel list-panel" data-testid="bot-catalog-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Registry</p>
              <h2>Bot Catalog</h2>
            </div>
          </div>
          <div className="scroll-list compact-list">
            {bots.length > 0 ? bots.map((bot) => (
              <article key={bot.id} className="list-card compact-card">
                <h3>{bot.name}</h3>
                <p>{bot.description || 'No description'}</p>
                <span>{bot.latestRevision.language}</span>
              </article>
            )) : <p className="muted">No bots stored yet.</p>}
          </div>
        </section>
      </div>
    </div>
  </div>
)}

{activeTab === 'arenas' && (
  <div>
    <div className="page-header">
      <div>
        <div className="page-title">Arenas</div>
        <div className="page-sub">Forge and manage battle arenas</div>
      </div>
    </div>
    <StatRow chips={[
      { label: 'Arenas', value: arenas.length },
      { label: 'Bots', value: bots.length },
      { label: 'Matches', value: matches.length },
    ]} />
    {/* Arena creation panel — copy from original left stack-column */}
    <section className="panel" data-testid="arena-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Arena Forge</p>
          <h2>Create Arena</h2>
        </div>
        <button className="ghost-button" type="button" onClick={() => setArenaForm(createInitialArenaState())}>
          Reset sample
        </button>
      </div>
      <div className="form-grid two-up">
        <label>
          <span>Name</span>
          <input value={arenaForm.name} onChange={(event) => setArenaForm((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          <span>Description</span>
          <input value={arenaForm.description} onChange={(event) => setArenaForm((current) => ({ ...current, description: event.target.value }))} />
        </label>
      </div>
      <CodeEditor language="arena" value={arenaForm.text} height={280} onChange={(value) => setArenaForm((current) => ({ ...current, text: value }))} />
      <button className="primary-button" type="button" onClick={() => void handleCreateArena()} disabled={submitting}>
        Save arena
      </button>
    </section>
  </div>
)}

{activeTab === 'matches' && (
  <div>
    <div className="page-header">
      <div>
        <div className="page-title">Matches</div>
        <div className="page-sub">Launch, replay, and review matches</div>
      </div>
    </div>
    <StatRow chips={[
      { label: 'Total', value: matches.length },
      { label: 'Completed', value: matches.filter((m) => m.status === 'completed').length },
      { label: 'Active', value: matches.filter((m) => m.status === 'running' || m.status === 'queued').length },
    ]} />
    {/* Match panel — copy from original center stack-column */}
    <section className="panel" data-testid="match-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h2>Launch Match</h2>
        </div>
        <span className="status-pill subtle">API-backed</span>
      </div>
      <div className="form-grid three-up">
        <label>
          <span>Name</span>
          <input value={matchForm.name} onChange={(event) => setMatchForm((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          <span>Mode</span>
          <select
            value={matchForm.mode}
            onChange={(event) => setMatchForm((current) => ({ ...current, mode: event.target.value as MatchMode, enqueue: event.target.value === 'queued' }))}
          >
            <option value="live">Live</option>
            <option value="queued">Queued</option>
            <option value="ladder">Ladder</option>
            <option value="round-robin">Round-robin</option>
            <option value="single-elimination">Single elimination</option>
            <option value="double-elimination">Double elimination</option>
          </select>
        </label>
        <label>
          <span>Arena</span>
          <select value={matchForm.arenaId} onChange={(event) => setMatchForm((current) => ({ ...current, arenaId: event.target.value }))}>
            <option value="">Select arena</option>
            {arenas.map((arena) => <option key={arena.id} value={arena.id}>{arena.name}</option>)}
          </select>
        </label>
      </div>
      <div className="form-grid two-up">
        <label>
          <span>Team A bot</span>
          <select value={matchForm.teamABotId} onChange={(event) => setMatchForm((current) => ({ ...current, teamABotId: event.target.value }))}>
            <option value="">Select bot</option>
            {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name} ({bot.latestRevision.language})</option>)}
          </select>
        </label>
        <label>
          <span>Team B bot</span>
          <select value={matchForm.teamBBotId} onChange={(event) => setMatchForm((current) => ({ ...current, teamBBotId: event.target.value }))}>
            <option value="">Select bot</option>
            {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name} ({bot.latestRevision.language})</option>)}
          </select>
        </label>
      </div>
      <div className="form-grid three-up">
        <label>
          <span>Seed</span>
          <input type="number" value={matchForm.seed} onChange={(event) => setMatchForm((current) => ({ ...current, seed: Number(event.target.value) }))} />
        </label>
        <label>
          <span>Max ticks</span>
          <input type="number" value={matchForm.maxTicks} onChange={(event) => setMatchForm((current) => ({ ...current, maxTicks: Number(event.target.value) }))} />
        </label>
        <label className="checkbox-row">
          <span>Queue execution</span>
          <input type="checkbox" checked={matchForm.enqueue} onChange={(event) => setMatchForm((current) => ({ ...current, enqueue: event.target.checked }))} />
        </label>
      </div>
      <button className="primary-button" type="button" onClick={() => void handleCreateMatch()} disabled={submitting}>
        {matchForm.enqueue || matchForm.mode === 'queued' ? 'Store and enqueue' : 'Store and run now'}
      </button>
    </section>
    <ReplayViewer match={selectedMatch} />
    <section className="panel list-panel" data-testid="stored-matches-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Runs</p>
          <h2>Stored Matches</h2>
        </div>
      </div>
      <div className="scroll-list compact-list">
        {matches.length > 0 ? matches.map((match) => (
          <button key={match.id} className={`match-list-card${selectedMatchId === match.id ? ' active' : ''}`} type="button" onClick={() => setSelectedMatchId(match.id)}>
            <span className="match-title">{match.name}</span>
            <span className="match-meta">{match.participants.map((p) => p.botName).join(' vs ')}</span>
            <span className="match-meta">{match.status} · {match.mode}</span>
          </button>
        )) : <p className="muted">No matches stored yet.</p>}
      </div>
    </section>
  </div>
)}

{activeTab === 'compete' && (
  <div>
    <div className="page-header">
      <div>
        <div className="page-title">Compete</div>
        <div className="page-sub">Ladders, tournaments, and standings</div>
      </div>
    </div>
    <StatRow chips={[
      { label: 'Ladders', value: ladders.length },
      { label: 'Tournaments', value: tournaments.length },
      { label: 'Bots', value: bots.length },
    ]} />
    {/* Ladder and tournament panels — copy from original right stack-column */}
    <section className="panel" data-testid="ladder-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Ranked Play</p>
          <h2>Create Ladder</h2>
        </div>
      </div>
      <div className="form-grid two-up">
        <label>
          <span>Name</span>
          <input value={ladderForm.name} onChange={(event) => setLadderForm((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          <span>Arena</span>
          <select value={ladderForm.arenaId} onChange={(event) => setLadderForm((current) => ({ ...current, arenaId: event.target.value }))}>
            <option value="">Select arena</option>
            {arenas.map((arena) => <option key={arena.id} value={arena.id}>{arena.name}</option>)}
          </select>
        </label>
      </div>
      <label>
        <span>Description</span>
        <input value={ladderForm.description} onChange={(event) => setLadderForm((current) => ({ ...current, description: event.target.value }))} />
      </label>
      <label>
        <span>Max ticks</span>
        <input type="number" value={ladderForm.maxTicks} onChange={(event) => setLadderForm((current) => ({ ...current, maxTicks: Number(event.target.value) }))} />
      </label>
      <BotChecklist bots={bots} selectedBotIds={ladderForm.entryBotIds} onToggle={(botId) => setLadderForm((current) => ({ ...current, entryBotIds: toggleSelection(current.entryBotIds, botId) }))} />
      <button className="primary-button" type="button" onClick={() => void handleCreateLadder()} disabled={submitting}>
        Create ladder
      </button>
      <div className="scroll-list competition-list">
        {ladders.length > 0 ? ladders.map((ladder) => (
          <article key={ladder.id} className="list-card">
            <div className="card-toolbar">
              <div>
                <h3>{ladder.name}</h3>
                <p>{ladder.description || 'No description'}</p>
              </div>
              <button className="ghost-button small-button" type="button" onClick={() => void handleLadderChallenge(ladder.id)} disabled={submitting || ladder.entries.length < 2}>
                Challenge top pair
              </button>
            </div>
            <p className="match-meta">{ladder.arenaName} · {ladder.entries.length} entries</p>
            <ol className="standing-list">
              {ladder.standings.slice(0, 4).map((standing) => (
                <li key={standing.ladderEntryId}>
                  <span>{standing.botName}</span>
                  <span>{standing.rating}</span>
                  <small>{standing.wins}-{standing.losses}-{standing.draws}</small>
                </li>
              ))}
            </ol>
          </article>
        )) : <p className="muted">No ladders yet.</p>}
      </div>
    </section>

    <section className="panel" data-testid="tournament-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Events</p>
          <h2>Create Tournament</h2>
        </div>
      </div>
      <div className="form-grid three-up">
        <label>
          <span>Name</span>
          <input value={tournamentForm.name} onChange={(event) => setTournamentForm((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          <span>Format</span>
          <select value={tournamentForm.format} onChange={(event) => setTournamentForm((current) => ({ ...current, format: event.target.value as TournamentFormat }))}>
            <option value="round-robin">Round-robin</option>
            <option value="single-elimination">Single elimination</option>
            <option value="double-elimination">Double elimination</option>
          </select>
        </label>
        <label>
          <span>Arena</span>
          <select value={tournamentForm.arenaId} onChange={(event) => setTournamentForm((current) => ({ ...current, arenaId: event.target.value }))}>
            <option value="">Select arena</option>
            {arenas.map((arena) => <option key={arena.id} value={arena.id}>{arena.name}</option>)}
          </select>
        </label>
      </div>
      <label>
        <span>Description</span>
        <input value={tournamentForm.description} onChange={(event) => setTournamentForm((current) => ({ ...current, description: event.target.value }))} />
      </label>
      <div className="form-grid two-up">
        <label>
          <span>Max ticks</span>
          <input type="number" value={tournamentForm.maxTicks} onChange={(event) => setTournamentForm((current) => ({ ...current, maxTicks: Number(event.target.value) }))} />
        </label>
        <label>
          <span>Seed base</span>
          <input type="number" value={tournamentForm.seedBase} onChange={(event) => setTournamentForm((current) => ({ ...current, seedBase: Number(event.target.value) }))} />
        </label>
      </div>
      <BotChecklist bots={bots} selectedBotIds={tournamentForm.entryBotIds} onToggle={(botId) => setTournamentForm((current) => ({ ...current, entryBotIds: toggleSelection(current.entryBotIds, botId) }))} />
      <button className="primary-button" type="button" onClick={() => void handleCreateTournament()} disabled={submitting}>
        Create tournament
      </button>
      <div className="scroll-list competition-list">
        {tournaments.length > 0 ? tournaments.map((tournament) => (
          <article key={tournament.id} className="list-card">
            <div className="card-toolbar">
              <div>
                <h3>{tournament.name}</h3>
                <p>{tournament.description || 'No description'}</p>
              </div>
              <div className="button-cluster">
                <button className="ghost-button small-button" type="button" onClick={() => void handleRunTournament(tournament.id, { enqueue: false, limit: 1 })} disabled={submitting || tournament.summary.pendingMatches === 0}>Run next</button>
                <button className="ghost-button small-button" type="button" onClick={() => void handleRunTournament(tournament.id, { enqueue: false })} disabled={submitting || tournament.summary.pendingMatches === 0}>Run all now</button>
                <button className="ghost-button small-button" type="button" onClick={() => void handleRunTournament(tournament.id, { enqueue: true })} disabled={submitting || tournament.summary.pendingMatches === 0}>Enqueue pending</button>
              </div>
            </div>
            <p className="match-meta">{tournament.format} · {tournament.entries.length} entrants · {tournament.arenaName}</p>
            <div className="summary-grid">
              <div className="summary-chip"><strong>{tournament.summary.completedMatches}/{tournament.summary.totalMatches}</strong><small>completed</small></div>
              <div className="summary-chip"><strong>{tournament.summary.pendingMatches}</strong><small>pending</small></div>
              <div className="summary-chip"><strong>{tournament.summary.queuedMatches + tournament.summary.runningMatches}</strong><small>active</small></div>
              <div className="summary-chip"><strong>{tournament.summary.failedMatches}</strong><small>failed</small></div>
            </div>
            <p className="leader-line">{getTournamentStatusLine(tournament)}</p>
            <ol className="standing-list compact-standing-list">
              {tournament.standings.slice(0, 4).map((standing) => (
                <li key={standing.tournamentEntryId}>
                  <span>#{standing.seed} {standing.botName}</span>
                  <span>{tournament.format === 'round-robin' ? String(standing.points) + ' pts' : standing.eliminated ? 'out' : 'alive'}</span>
                  <small>{standing.wins}-{standing.losses}-{standing.draws}</small>
                </li>
              ))}
            </ol>
            <div className="round-summary-list">
              {tournament.rounds.slice(0, 6).map((round) => {
                const counts = getRoundStateCounts(tournament, round.id);
                return (
                  <div key={round.id} className="round-summary-item">
                    <span>{round.label}</span>
                    <small>{counts.completed}/{counts.total} complete · {counts.pending} pending</small>
                  </div>
                );
              })}
            </div>
          </article>
        )) : <p className="muted">No tournaments yet.</p>}
      </div>
    </section>
  </div>
)}
```

- [ ] **Step 3: Remove the now-unused old JSX**

Delete the old `<section className="dashboard-grid expanded-grid">` block and the `<header className="hero">` block entirely. They have been replaced by the four tab sections above.

Also delete the old `<div className="background-grid" />` line — it's no longer needed.

- [ ] **Step 4: Run TypeScript check**

```bash
npm run check
```
Expected: passes with no errors.

- [ ] **Step 5: Verify all four tabs in browser**

- Click each tab in the sidebar — correct content appears
- No console errors
- Refresh button works on each tab
- Creating a bot on the Bots tab updates the badge count in the nav

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: split App into four tab sections with stat chips"
```

---

## Task 5: Final verification

**Files:** read-only checks

- [ ] **Step 1: Run full check suite**

```bash
npm run check
npm test
```
Expected: all pass, no new failures.

- [ ] **Step 2: Verify success criteria from spec**

Check each item:
- [ ] Dark mode renders correctly (`#0f1117` background, Inter font)
- [ ] Light mode renders correctly (white surface, dark text) — toggle and confirm
- [ ] Theme persists across page reload (check localStorage in DevTools)
- [ ] Sidebar visible at ≥700px; top bar + bottom nav visible at <700px
- [ ] All four tabs work: Bots, Arenas, Matches, Compete
- [ ] Create bot → new bot appears in Bot Catalog on same tab
- [ ] Launch match → appears in Stored Matches on Matches tab
- [ ] Replay viewer renders on Matches tab
- [ ] Create ladder + tournament work on Compete tab
- [ ] All `data-testid` attributes still present on their panels
- [ ] Georgia serif font is gone; Inter renders everywhere
- [ ] JetBrains Mono renders in code editor areas

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete modern UI redesign"
```
