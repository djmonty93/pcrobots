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

The app gains a minimal URL-aware router for unauthenticated views only. No routing library is added — just `window.location.pathname` checked on load and `history.pushState` for navigation. A `popstate` listener handles the browser back button.

| Path | Unauthenticated | Authenticated |
|---|---|---|
| `/` | Landing page | App (bots tab, as today) |
| `/docs/creating-bots` | Bot creation doc | Bot creation doc |
| `/docs/running-bots` | Running bots doc | Running bots doc |
| anything else | Redirect to `/` | App (bots tab) |

Doc pages are accessible to both authenticated and unauthenticated users — a logged-in user sharing a link to `/docs/creating-bots` should land there, not get redirected.

The router state lives in a new `currentRoute` state variable in `App.tsx` (e.g. `"landing" | "docs-creating-bots" | "docs-running-bots"`).

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

Left column uses `overflow-y: auto`. Right column is `position: sticky; top: 0; height: 100vh` so the form stays visible while marketing content scrolls.

### Mobile (≤700px)

Single column, stacked: marketing content on top, login form below.

---

## Left Column Content

Top to bottom:

### 1. Logo + wordmark
- "PCRobots" in JetBrains Mono, large weight
- Small decorative robot/terminal icon (SVG inline or Unicode `🤖` as fallback)

### 2. Tagline
> "Write code. Build robots. Fight."

### 3. Description (2 sentences)
> PCRobots is a competitive programming game inspired by the classic 1980s DOS battle-bot arena. You write AI code in any of 5 languages — your robot fights for survival against others in real time.

### 4. Feature chips
Four inline chips using existing `.stat-chip` / badge styling:
- `5 languages`
- `Live replays`
- `Ladders`
- `Tournaments`

### 5. How to play (3-step flow)
Step indicators with brief labels:
1. **Write a bot** — Code your robot's AI in JavaScript, TypeScript, Python, Lua, or upload a Linux binary
2. **Pick an arena** — Choose a battlefield with walls, hazards, refuel zones, and damage traps
3. **Battle** — Run matches, climb ladder rankings, or compete in elimination tournaments

### 6. Doc links
Two prominent text links:
- `Bot creation guide →` — navigates to `/docs/creating-bots`
- `Running a match →` — navigates to `/docs/running-bots`

---

## Right Column Content (Login Form)

The existing login/register functionality, restyled for the new layout:

- Heading: "Sign in" (or "Create account" when in register mode)
- Email field + password field
- **"Sign in"** primary button
- **"Create account"** ghost/secondary button (toggles between sign-in and register mode, or keeps both visible)
- Error/success message banner above the form (as today)
- "Checking session…" state during initial auth check

No functional changes to authentication logic.

---

## Doc Page Template

Both doc pages share a common layout:

- Back link: `← PCRobots` at top left, navigates to `/`
- Max-width ~720px, left-aligned
- Heading, prose, and syntax-highlighted code blocks
- Cross-link at the bottom pointing to the other doc page

Code blocks use `<pre><code>` with the existing `--code-bg` / `--code-border` CSS variables. No syntax highlighting library is added — plain monospace is sufficient.

---

## `/docs/creating-bots` Content

### What is a bot?

A bot is a function called once per game tick. It receives a snapshot of the game state (position, heading, nearby robots, scans, health, fuel) and must return an action (move, turn, fire, scan, etc.).

### Supported languages

For each of the 5 languages, a short starter example is shown:

**JavaScript**
```js
export function onTurn(state) {
  return { action: "move" };
}
```

**TypeScript**
```ts
import type { RobotTurnSnapshot, RobotAction } from "@pcrobots/bot-sdk";
export function onTurn(state: RobotTurnSnapshot): RobotAction {
  return { action: "move" };
}
```

**Python**
```python
import sys, json
state = json.loads(sys.stdin.read())
print(json.dumps({"action": "move"}))
```

**Lua**
```lua
local state = json.decode(io.read("*a"))
print(json.encode({ action = "move" }))
```

**Linux x64 binary** — Read JSON from stdin, write JSON to stdout. Upload as a compiled ELF executable.

### Uploading your bot

1. Go to the **Bots** tab after signing in
2. Click **New bot**
3. Choose a language, paste your code (or upload a binary), and save

---

## `/docs/running-bots` Content

### Arenas

An arena is a 100×100 text grid. Special characters:
- `A` / `B` / `C` — team start positions
- `X` — wall (impassable)
- `S` — slow zone
- `D` — damage zone
- `R` — refuel zone
- `*` — obstacle

### Running a match

1. Go to the **Matches** tab
2. Pick an arena, add bots (assign to teams A/B/C), set a tick limit and seed
3. Click **Run** — results appear immediately, or **Enqueue** to run in the background worker
4. View the replay in the match list

### Ladders

A ladder is an ongoing ranked competition. Bots earn ratings based on wins and losses. Use the **Compete** tab to create a ladder and challenge other entries.

### Tournaments

Tournaments run a full bracket in one go — round-robin, single-elimination, or double-elimination. Go to the **Compete** tab, create a tournament, add bots, and run all pending matches.

---

## Implementation Notes

### Files changed

- `apps/web/src/App.tsx` — add `currentRoute` state, routing logic, landing page component, doc page components
- `apps/web/src/styles.css` — add landing page and doc page styles (new `.landing-*` classes)

### Files added

None required — all new UI lives in `App.tsx` and `styles.css` to stay consistent with the project's existing single-file-per-concern convention.

### No new dependencies

- No routing library (React Router, etc.)
- No syntax highlighting library
- No new fonts (Inter + JetBrains Mono already loaded)

### Existing login logic

The `handleLogin`, `handleRegister`, `loginForm`, `submitting`, `loading`, `error`, and `message` state in `App.tsx` are reused as-is. The right column of the landing page renders exactly the same form, just in a new layout container.

---

## Out of Scope

- Animated hero / particle effects
- Server-side rendering or SEO meta tags
- Internationalization
- Embed previews / Open Graph tags
- Admin-only or authenticated-only doc content
