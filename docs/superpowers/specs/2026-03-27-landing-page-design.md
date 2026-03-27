# Landing Page & Doc Routes Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the minimal login panel shown to unauthenticated users with a split-screen landing page that explains the game, links to doc pages, and converts visitors into registered players.

**Visual tone:** Dark techie — consistent with the existing app UI (dark backgrounds, indigo accent, Inter + JetBrains Mono fonts, CSS custom properties).

---

## Overview

When a user is not authenticated, they currently see a plain centered login panel. This design replaces that with:

1. A **split-screen landing page** (`/`) — left column is marketing content, right column is the login/register form.
2. Two **doc pages** — `/docs/creating-bots` and `/docs/running-bots` — accessible without login, using simple in-SPA routing.

Authenticated users are unaffected. The existing tab-based app continues to work exactly as before.

---

## Routing

The app gains a minimal URL-aware router for unauthenticated views only. No routing library is added — just `window.location.pathname` checked on load and `history.pushState` for navigation.

The router state lives in a new `currentRoute` state variable in `App.tsx`:

```ts
type Route = "landing" | "docs-creating-bots" | "docs-running-bots";
```

### Route table

| Path | Unauthenticated | Authenticated |
|---|---|---|
| `/` | Landing page | App (bots tab, as today) |
| `/docs/creating-bots` | Bot creation doc | Bot creation doc |
| `/docs/running-bots` | Running bots doc | Running bots doc |
| anything else | Redirect to `/` | App (bots tab) |

Doc pages are accessible to both authenticated and unauthenticated users — a logged-in user sharing a link to `/docs/creating-bots` should land there, not be redirected to the app.

### Back button support

The `popstate` listener must be registered inside a `useEffect` with a cleanup return so it is removed on unmount and does not leak on re-renders:

```ts
useEffect(() => {
  const handler = () => setCurrentRoute(routeFromPathname(window.location.pathname));
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}, []);
```

### `document.title`

Set `document.title` on each route change:

| Route | Title |
|---|---|
| `landing` | `PCRobots` |
| `docs-creating-bots` | `Creating a Bot — PCRobots` |
| `docs-running-bots` | `Running a Match — PCRobots` |

---

## Landing Page DOM Structure

The landing page renders **outside** the existing `.shell` layout. When `currentRoute === "landing"` and `currentUser` is null, the top-level render returns the landing page element directly instead of the `.shell` div. This is necessary because `.shell` is `height: 100vh; overflow: hidden` and would break the sticky right-column behaviour.

```
<div class="landing-shell">
  <div class="landing-left">   <!-- scrollable marketing content -->
  <div class="landing-right">  <!-- sticky login form -->
```

The `.shell`, `.sidebar`, `.content-wrap` etc. are not rendered at all on the landing page.

---

## Landing Page Layout

### Desktop (>700px)

Full-viewport two-column layout:

```
┌─────────────────────────────┬──────────────────────┐
│  Left: Marketing (55%)      │  Right: Login (45%)  │
│  (scrollable)               │  (sticky, centered)  │
└─────────────────────────────┴──────────────────────┘
```

`.landing-left` uses `overflow-y: auto; height: 100vh`. `.landing-right` is `position: sticky; top: 0; height: 100vh; display: flex; align-items: center; justify-content: center`.

### Mobile (≤700px)

Single column, stacked: marketing content on top, login form below. Both columns become `width: 100%` and the sticky behaviour is removed.

---

## Landing Page — Loading State

On initial page load, `loading` is `true` while the auth session is checked. During this time the landing page renders normally (full marketing content visible), but the right-column form shows a subtle disabled state: the "Sign in" button reads "Checking…" and is `disabled`. This matches existing behaviour but scoped to the right column only — the marketing content is never hidden or replaced by a spinner.

---

## Left Column Content

Top to bottom:

### 1. Logo + wordmark
- "PCRobots" in JetBrains Mono, large (2rem+), semibold weight
- Unicode robot emoji `⚙` or `🤖` as inline decoration (no SVG dependency)

### 2. Tagline
> "Write code. Build robots. Fight."

### 3. Description (2 sentences)
> PCRobots is a competitive programming game inspired by the classic 1980s DOS battle-bot arena. You write AI code in any of 5 languages — your robot fights for survival against others in real time.

### 4. Feature chips

Four small inline badges using a new `.landing-chip` class (not `.stat-chip` — that is a KPI dashboard widget with a label/value/delta layout and is not appropriate here).

`.landing-chip` is a compact single-line badge:

```css
.landing-chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border2);
  background: var(--surface2);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-dim);
}
```

Labels: `5 languages` · `Live replays` · `Ladders` · `Tournaments`

### 5. How to play (3-step flow)
Step indicators with numbered circles and brief labels:

1. **Write a bot** — Code your robot's AI in JavaScript, TypeScript, Python, Lua, or upload a Linux binary
2. **Pick an arena** — Choose a battlefield with walls, hazards, refuel zones, and damage traps
3. **Battle** — Run matches, climb ladder rankings, or compete in elimination tournaments

### 6. Doc links
Two prominent text links using `--accent` colour with arrow:
- `Bot creation guide →` — navigates to `/docs/creating-bots` via `history.pushState`
- `Running a match →` — navigates to `/docs/running-bots` via `history.pushState`

---

## Right Column Content (Login Form)

The existing login/register functionality, restyled for the new layout. All existing state variables (`loginForm`, `submitting`, `loading`, `error`, `message`, `handleLogin`, `handleRegister`) are reused — only the surrounding markup changes.

- Heading: "Sign in"
- Email field + password field
- **"Sign in"** primary button (reads "Checking…" and is `disabled` while `loading` is true)
- **"Create account"** ghost/secondary button
- Error/success message banner above the form (as today)

No functional changes to authentication logic.

---

## Doc Page Template

Both doc pages share a common layout component (`DocPage`). Extract as a new file `apps/web/src/DocPage.tsx` — consistent with the existing pattern of extracting focused components (`CodeEditor.tsx`, `ReplayViewer.tsx` are already separate files).

Structure:

```
<div class="doc-shell">
  <div class="doc-content">   <!-- max-width: 720px; margin: 0 auto -->
    <a href="/" class="doc-back">← PCRobots</a>
    <h1>...</h1>
    <!-- prose and code blocks -->
    <div class="doc-footer-link">...</div>
  </div>
</div>
```

- Back link `← PCRobots` at top left, navigates to `/` via `history.pushState`
- Max-width 720px, left-aligned, generous vertical padding
- Code blocks: `<pre><code class="doc-code">` styled with `--code-bg` / `--code-border`
- Cross-links at the bottom:
  - Creating bots page footer: `Next: Running a match →`
  - Running bots page footer: `← Back: Creating a bot`

Doc pages render outside `.shell` (same as the landing page — both use their own top-level containers).

---

## `/docs/creating-bots` Content

### What is a bot?

A bot is a function called once per game tick. It receives a snapshot of the current game state (position, heading, nearby robots, scan results, health, fuel) and returns an action object.

### Supported languages

Use the exact same starter code shown in the app's Bots tab (from `defaultBotTemplates` in `App.tsx`):

**JavaScript** (CommonJS module)
```js
module.exports = function onTurn(snapshot) {
  if (snapshot.tick === 0) return { kind: "scan", heading: 0, resolution: 12 };
  if (snapshot.tick === 1) return { kind: "shoot", heading: 0, range: 45 };
  return { kind: "movement", targetSpeed: 35, heading: 0 };
};
```

**TypeScript** (CommonJS export)
```ts
type TurnSnapshot = {
  tick: number;
};

export = function onTurn(snapshot: TurnSnapshot) {
  if (snapshot.tick === 0) return { kind: "scan", heading: 0, resolution: 10 };
  return { kind: "movement", targetSpeed: 30, heading: 0 };
};
```

**Python** (function, not stdin/stdout)
```python
from typing import Any

def on_turn(snapshot: dict[str, Any]):
    if snapshot["tick"] == 0:
        return {"kind": "scan", "heading": 0, "resolution": 10}
    return {"kind": "movement", "targetSpeed": 30, "heading": 0}
```

**Lua** (returns a function)
```lua
local function on_turn(snapshot)
  if snapshot.tick == 0 then
    return { kind = "scan", heading = 0, resolution = 10 }
  end
  return { kind = "movement", targetSpeed = 30, heading = 0 }
end

return on_turn
```

**Linux x64 binary** — Compile any language to a Linux ELF executable. The runtime reads the snapshot from stdin as JSON and expects your bot to write the action to stdout as JSON.

### Action kinds

| kind | Description |
|---|---|
| `movement` | Move at `targetSpeed` toward `heading` |
| `scan` | Radar scan at `heading` with `resolution` |
| `shoot` | Fire at `heading` with `range` |

### Uploading your bot

1. Go to the **Bots** tab after signing in
2. Click **New bot**
3. Choose a language, paste your code (or upload a binary), and save

---

## `/docs/running-bots` Content

### Arenas

An arena is a 100×100 text grid. Each character represents one cell:

| Character | Meaning |
|---|---|
| `.` | Empty space |
| `A` / `B` / `C` | Team start positions |
| `X` | Wall (impassable) |
| `S` | Slow zone |
| `D` | Damage zone |
| `R` | Refuel zone |
| `*` | Obstacle |

### Running a match

1. Go to the **Matches** tab
2. Pick an arena, add bots (assign to teams A/B/C), set a tick limit and seed
3. Click **Run** — results appear immediately, or **Enqueue** to run via the background worker
4. View the tick-by-tick replay in the match list

### Ladders

A ladder is an ongoing ranked competition. Bots earn ratings based on wins and losses. Use the **Compete** tab to create a ladder and challenge other entries.

### Tournaments

Tournaments run a full bracket in one go — round-robin, single-elimination, or double-elimination. Go to the **Compete** tab, create a tournament, add bots, and run all pending matches.

---

## Implementation Notes

### Files changed

- `apps/web/src/App.tsx` — add `currentRoute` state, `routeFromPathname` helper, `popstate` effect, landing page component, route-aware render logic, `document.title` updates
- `apps/web/src/styles.css` — add `.landing-shell`, `.landing-left`, `.landing-right`, `.landing-chip`, `.landing-steps`, `.doc-shell`, `.doc-content`, `.doc-back`, `.doc-code`, `.doc-footer-link`

### Files added

- `apps/web/src/DocPage.tsx` — shared doc page layout component (consistent with `CodeEditor.tsx` and `ReplayViewer.tsx` which are already separate files)

### No new dependencies

- No routing library (React Router, etc.)
- No syntax highlighting library
- No new fonts (Inter + JetBrains Mono already loaded)

### Existing login logic

The `handleLogin`, `handleRegister`, `loginForm`, `submitting`, `loading`, `error`, and `message` state in `App.tsx` are reused as-is. The right column of the landing page renders exactly the same form elements, just inside the new `.landing-right` container.

---

## Out of Scope

- Animated hero / particle effects
- Server-side rendering or SEO meta tags
- Internationalization
- Embed previews / Open Graph tags
- Admin-only or authenticated-only doc content
