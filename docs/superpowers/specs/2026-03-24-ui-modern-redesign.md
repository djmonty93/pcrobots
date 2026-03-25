# PCRobots UI Modern Redesign — Design Spec

## Goal

Replace the current single-page warm-cream layout with a modern dark-first SaaS UI: sidebar navigation, light/dark theme toggle, and responsive mobile layout — without changing any backend API behaviour.

## Context

The existing UI (`apps/web/src/`) is a single React component (`App.tsx`) with all sections rendered simultaneously in a fixed 3-column dashboard grid. It uses a Georgia serif font, warm amber colour palette, and has only minimal responsiveness (collapses to 1 column at 1440px). There is no navigation between sections; everything is visible at once. This becomes overwhelming on small screens and doesn't scale as sections grow.

---

## Architecture

### Navigation model

All sections are grouped under four top-level nav items:

| Nav item | Sections it contains |
|---|---|
| **Bots** | Create/edit bot (with code editor) · Bot catalog list |
| **Arenas** | Create arena (with code editor) · Arena list |
| **Matches** | Launch match form · Replay viewer · Stored matches list |
| **Compete** | Create ladder · Ladder standings · Create tournament · Tournament standings |

Only the active section is rendered. Navigation state is local React state (`activeTab`). No routing library is introduced — this is a single-page tool, not a multi-page app.

### Theme system

Theme is managed via a `data-theme` attribute on `<html>` and CSS custom properties only. No JS theme library. Preference is persisted to `localStorage` under the key `pcrobots-theme`. Initial value is read from `localStorage` on mount; falls back to `dark`.

### Responsive strategy

| Viewport | Layout |
|---|---|
| ≥ 700px | 240px fixed sidebar + scrollable content area |
| < 700px | No sidebar · 56px top bar (logo + theme toggle + avatar) · Fixed bottom nav (4 tabs) · Single-column content |

The breakpoint is 700px, matching the mockup.

---

## Visual Design

### Colour tokens

Two full token sets, switched by `[data-theme="dark"]` / `[data-theme="light"]` on `<html>`:

**Dark (default)**
```
--bg:        #0f1117
--surface:   #161b27
--surface2:  #1e2535
--border:    rgba(255,255,255,0.08)
--border2:   rgba(255,255,255,0.14)
--accent:    #6366f1
--accent2:   #818cf8
--green:     #4ade80
--text:      #f1f5f9
--text-dim:  #c8d4e8
--text-muted:#8b9db8
```

**Light**
```
--bg:        #f4f6fb
--surface:   #ffffff
--surface2:  #eef1f8
--border:    rgba(0,0,0,0.08)
--border2:   rgba(0,0,0,0.14)
--accent:    #6366f1
--accent2:   #4f46e5
--green:     #16a34a
--text:      #0f172a
--text-dim:  #334155
--text-muted:#64748b
```

### Typography

- Body/UI: `'Inter', system-ui, sans-serif` — loaded from Google Fonts
- Code editors and monospace values: `'JetBrains Mono', 'Courier New', monospace` — loaded from Google Fonts
- Remove the existing Georgia serif font entirely

### Component patterns

- **Cards**: `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 12px`, `padding: 22px`
- **Buttons — primary**: `background: var(--accent)`, white text, `border-radius: 8px`, `padding: 10px 20px`
- **Buttons — ghost**: `background: var(--surface2)`, `border: 1px solid var(--border2)`, `color: var(--text-dim)`
- **Form inputs/selects**: `background: var(--bg)`, `border: 1px solid var(--border2)`, `border-radius: 7px`, `color: var(--text)`
- **Status badges**: small pill with coloured background at low opacity + matching text colour (green for completed, amber for pending/queued/running, red for failed)
- **Language badges**: JS = amber, PY = green, TS = blue — all at 15% opacity background
- **Stat chips**: surface background, label in `text-muted`, value in `text` at 24px bold, delta line in `--green`

---

## File Changes

### Modified files

| File | Change |
|---|---|
| `apps/web/src/styles.css` | Full replacement — new token system, component classes, sidebar/topbar/bottom-nav layout, responsive breakpoints, theme transitions |
| `apps/web/src/App.tsx` | Add `activeTab` state + tab switching logic. Wrap each section group in a conditional render. Add sidebar, topbar, bottom-nav chrome. Add theme toggle button + localStorage persistence. Keep all existing form state, handlers, and API calls unchanged. |
| `apps/web/index.html` | Add Google Fonts `<link>` preconnect + stylesheet for Inter and JetBrains Mono |

### No new files

All changes land in the three files above. No new components are introduced — the existing `CodeEditor` and `ReplayViewer` are reused as-is.

---

## Layout Structure (JSX skeleton)

```
<html data-theme="dark|light">
  <body>
    <div class="shell">               ← flex row
      <nav class="sidebar">           ← desktop only (hidden <700px)
        logo · nav items · footer (avatar + theme toggle)
      </nav>

      <div class="content-wrap">      ← flex column, fills remaining width
        <div class="topbar">          ← mobile only (hidden ≥700px)
          logo · avatar · theme toggle
        </div>

        <main class="content">
          <div class="content-inner">
            {activeTab === 'bots'    && <BotsSection />}
            {activeTab === 'arenas'  && <ArenasSection />}
            {activeTab === 'matches' && <MatchesSection />}
            {activeTab === 'compete' && <CompeteSection />}
          </div>
        </main>

        <nav class="bottom-nav">      ← mobile only (hidden ≥700px)
          Bots · Arenas · Matches · Compete
        </nav>
      </div>
    </div>
  </body>
</html>
```

The four section groups are extracted from the current monolithic JSX into named functions or clearly-labelled JSX blocks within `App.tsx`. No new files.

---

## Stat bar

The existing 5-stat header row (bots, arenas, matches, ladders, tournaments) becomes three chips shown at the top of the active section's content area, scoped to what's relevant per tab:

- **Bots tab**: Bots count, total match appearances, (placeholder third)
- **Matches tab**: Matches count, completed count, running/queued count
- **Compete tab**: Ladders count, Tournaments count, (champion if any)
- **Arenas tab**: Arenas count, (two placeholders)

This keeps the stat-chip pattern visible on every tab without a fixed global header.

---

## Theme toggle behaviour

1. On mount: read `localStorage.getItem('pcrobots-theme')`. If `'light'`, set `document.documentElement.setAttribute('data-theme', 'light')`. Otherwise default `dark`.
2. Toggle: flip `data-theme` between `'dark'` and `'light'`, write new value to `localStorage`.
3. Button icon: ☀️ when dark (clicking switches to light), 🌙 when light (clicking switches to dark).

---

## What is NOT changing

- All API calls in `api.ts` — untouched
- `CodeEditor.tsx` — untouched
- `ReplayViewer.tsx` — untouched
- All form state, validation logic, and handler functions in `App.tsx`
- The arena text editor format
- All `data-testid` attributes on existing sections (for test compatibility)

---

## Success criteria

- [ ] Dark mode renders correctly; light mode renders correctly; toggle switches between them and persists across page reload
- [ ] All four nav tabs render the correct sections on desktop and mobile
- [ ] Sidebar visible at ≥700px; top bar + bottom nav visible at <700px; no layout overlap at the boundary
- [ ] All existing functionality works: create bot, create arena, launch match, replay viewer, create ladder, create tournament
- [ ] Google Fonts load (Inter + JetBrains Mono); Georgia font is gone
- [ ] `npm run check` passes with no new TypeScript errors
