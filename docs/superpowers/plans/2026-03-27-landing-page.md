# Landing Page & Doc Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal login panel with a split-screen landing page (marketing left, login right) and add two in-SPA doc routes (`/docs/creating-bots`, `/docs/running-bots`).

**Architecture:** Three files change — `App.tsx` gains routing state and a landing page component; `styles.css` gains landing/doc CSS classes; a new `DocPage.tsx` holds the shared doc layout and both doc page contents. No new runtime dependencies. Routing is `window.location.pathname` + `history.pushState` — no library.

**Tech Stack:** React 19, TypeScript, Vite, plain CSS with CSS custom properties. Verify with `npm run check` (tsc) in `apps/web/`. Dev server: `npm run dev` in `apps/web/`.

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/src/App.tsx` | Modify | Add `Route` type, `routeFromPathname`, `currentRoute` state, `popstate` effect, `document.title` effect, landing page JSX, updated render logic |
| `apps/web/src/styles.css` | Modify | Add `.landing-shell`, `.landing-left`, `.landing-right`, `.landing-hero`, `.landing-chip`, `.landing-steps`, `.landing-links`, `.landing-form`, `.doc-shell`, `.doc-content`, `.doc-back`, `.doc-code`, `.doc-footer-link` |
| `apps/web/src/DocPage.tsx` | Create | `DocPage` layout wrapper + `CreatingBotsPage` and `RunningBotsPage` content components |

---

## Task 1: Add routing infrastructure to App.tsx

**Files:**
- Modify: `apps/web/src/App.tsx` (top of file, near other state declarations ~line 285)

- [ ] **Step 1: Add the `Route` type and `routeFromPathname` helper**

  Add immediately before the `App()` function definition (around line 285, after the `Tab` type):

  ```tsx
  type Route = "landing" | "docs-creating-bots" | "docs-running-bots";

  function routeFromPathname(pathname: string): Route {
    if (pathname === "/docs/creating-bots") return "docs-creating-bots";
    if (pathname === "/docs/running-bots") return "docs-running-bots";
    return "landing";
  }
  ```

- [ ] **Step 2: Add `currentRoute` state inside the `App()` function**

  Add after the existing `useState` declarations (after the `theme` state around line 314):

  ```tsx
  const [currentRoute, setCurrentRoute] = useState<Route>(
    () => routeFromPathname(window.location.pathname)
  );
  ```

- [ ] **Step 3: Add the `popstate` effect and `document.title` effect**

  Add after the existing `useEffect` for session restore (after line ~422):

  ```tsx
  useEffect(() => {
    const handler = () => setCurrentRoute(routeFromPathname(window.location.pathname));
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    if (currentRoute === "docs-creating-bots") {
      document.title = "Creating a Bot — PCRobots";
    } else if (currentRoute === "docs-running-bots") {
      document.title = "Running a Match — PCRobots";
    } else {
      document.title = "PCRobots";
    }
  }, [currentRoute]);
  ```

- [ ] **Step 4: Add the `navigate` helper function**

  Add alongside the `toggleTheme` function (~line 325):

  ```tsx
  function navigate(path: string) {
    history.pushState(null, "", path);
    setCurrentRoute(routeFromPathname(path));
  }
  ```

- [ ] **Step 5: Typecheck**

  Run in `apps/web/`:
  ```bash
  npm run check
  ```
  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/src/App.tsx
  git commit -m "feat: add routing infrastructure (Route type, routeFromPathname, currentRoute state)"
  ```

---

## Task 2: Create DocPage.tsx

**Files:**
- Create: `apps/web/src/DocPage.tsx`

- [ ] **Step 1: Create the file with DocPage layout wrapper and both page components**

  ```tsx
  interface DocPageProps {
    title: string;
    children: React.ReactNode;
    footerLink: React.ReactNode;
    onNavigate: (path: string) => void;
  }

  function DocPage({ title, children, footerLink, onNavigate }: DocPageProps) {
    return (
      <div className="doc-shell">
        <div className="doc-content">
          <a
            className="doc-back"
            href="/"
            onClick={(e) => { e.preventDefault(); onNavigate("/"); }}
          >
            ← PCRobots
          </a>
          <h1>{title}</h1>
          {children}
          <div className="doc-footer-link">{footerLink}</div>
        </div>
      </div>
    );
  }

  interface DocPageNavProps {
    onNavigate: (path: string) => void;
  }

  export function CreatingBotsPage({ onNavigate }: DocPageNavProps) {
    return (
      <DocPage
        title="Creating a Bot"
        onNavigate={onNavigate}
        footerLink={
          <a href="/docs/running-bots" onClick={(e) => { e.preventDefault(); onNavigate("/docs/running-bots"); }}>
            Next: Running a match →
          </a>
        }
      >
        <section className="doc-section">
          <h2>What is a bot?</h2>
          <p>
            A bot is a function called once per game tick. It receives a{" "}
            <code>RobotTurnSnapshot</code> and returns an action object.
          </p>
          <p>The snapshot has three fields:</p>
          <table className="doc-table">
            <thead>
              <tr><th>Field</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>tick</code></td><td><code>number</code></td><td>Current game tick (0-indexed)</td></tr>
              <tr><td><code>self</code></td><td><code>RobotObservation</code></td><td>Your robot's current state</td></tr>
              <tr><td><code>localMap</code></td><td><code>number[][]</code></td><td>9×9 grid of cell types centred on your robot</td></tr>
            </tbody>
          </table>
          <p>
            <code>self</code> contains: <code>id</code>, <code>name</code>,{" "}
            <code>teamId</code>, <code>x</code>, <code>y</code>,{" "}
            <code>heading</code>, <code>speed</code>, <code>battery</code>,{" "}
            <code>armour</code>, <code>shellsLeft</code>, <code>invisible</code>.
          </p>
          <p>
            <code>localMap</code> cell values: <code>0</code> = free,{" "}
            <code>1</code> = wall/out-of-bounds, <code>2</code> = slow,{" "}
            <code>3</code> = damage, <code>4</code> = obstacle, <code>30</code> = refuel.
          </p>
        </section>

        <section className="doc-section">
          <h2>Action kinds</h2>
          <table className="doc-table">
            <thead>
              <tr><th>kind</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>movement</code></td><td>Move at <code>targetSpeed</code> toward <code>heading</code></td></tr>
              <tr><td><code>scan</code></td><td>Radar scan at <code>heading</code> with <code>resolution</code></td></tr>
              <tr><td><code>shoot</code></td><td>Fire at <code>heading</code> with <code>range</code></td></tr>
            </tbody>
          </table>
        </section>

        <section className="doc-section">
          <h2>Supported languages</h2>

          <h3>JavaScript (CommonJS module)</h3>
          <pre className="doc-code"><code>{`module.exports = function onTurn(snapshot) {
  if (snapshot.tick === 0) return { kind: "scan", heading: 0, resolution: 12 };
  if (snapshot.tick === 1) return { kind: "shoot", heading: 0, range: 45 };
  return { kind: "movement", targetSpeed: 35, heading: 0 };
};`}</code></pre>

          <h3>TypeScript (CommonJS export)</h3>
          <pre className="doc-code"><code>{`type TurnSnapshot = {
  tick: number;
};

export = function onTurn(snapshot: TurnSnapshot) {
  if (snapshot.tick === 0) return { kind: "scan", heading: 0, resolution: 10 };
  return { kind: "movement", targetSpeed: 30, heading: 0 };
};`}</code></pre>

          <h3>Python (function, not stdin/stdout)</h3>
          <pre className="doc-code"><code>{`from typing import Any

def on_turn(snapshot: dict[str, Any]):
    if snapshot["tick"] == 0:
        return {"kind": "scan", "heading": 0, "resolution": 10}
    return {"kind": "movement", "targetSpeed": 30, "heading": 0}`}</code></pre>

          <h3>Lua (returns a function)</h3>
          <pre className="doc-code"><code>{`local function on_turn(snapshot)
  if snapshot.tick == 0 then
    return { kind = "scan", heading = 0, resolution = 10 }
  end
  return { kind = "movement", targetSpeed = 30, heading = 0 }
end

return on_turn`}</code></pre>

          <h3>Linux x64 binary</h3>
          <p>
            Compile any language to a Linux ELF executable. The runtime reads the snapshot
            from stdin as JSON and expects your bot to write the action to stdout as JSON.
          </p>
        </section>

        <section className="doc-section">
          <h2>Uploading your bot</h2>
          <ol>
            <li>Go to the <strong>Bots</strong> tab after signing in</li>
            <li>Click <strong>New bot</strong></li>
            <li>Choose a language, paste your code (or upload a binary), and save</li>
          </ol>
        </section>
      </DocPage>
    );
  }

  export function RunningBotsPage({ onNavigate }: DocPageNavProps) {
    return (
      <DocPage
        title="Running a Match"
        onNavigate={onNavigate}
        footerLink={
          <a href="/docs/creating-bots" onClick={(e) => { e.preventDefault(); onNavigate("/docs/creating-bots"); }}>
            ← Back: Creating a bot
          </a>
        }
      >
        <section className="doc-section">
          <h2>Arenas</h2>
          <p>An arena is a 100×100 text grid. Each character represents one cell:</p>
          <table className="doc-table">
            <thead>
              <tr><th>Character</th><th>Meaning</th></tr>
            </thead>
            <tbody>
              <tr><td><code>.</code></td><td>Empty space</td></tr>
              <tr><td><code>A</code> / <code>B</code> / <code>C</code></td><td>Team start positions</td></tr>
              <tr><td><code>X</code></td><td>Wall (impassable)</td></tr>
              <tr><td><code>S</code></td><td>Slow zone</td></tr>
              <tr><td><code>D</code></td><td>Damage zone</td></tr>
              <tr><td><code>R</code></td><td>Refuel zone</td></tr>
              <tr><td><code>*</code></td><td>Obstacle</td></tr>
            </tbody>
          </table>
        </section>

        <section className="doc-section">
          <h2>Running a match</h2>
          <ol>
            <li>Go to the <strong>Matches</strong> tab</li>
            <li>Pick an arena, add bots (assign to teams A/B/C), set a tick limit and seed</li>
            <li>Click <strong>Run</strong> — results appear immediately, or <strong>Enqueue</strong> to run via the background worker</li>
            <li>View the tick-by-tick replay in the match list</li>
          </ol>
        </section>

        <section className="doc-section">
          <h2>Ladders</h2>
          <p>
            A ladder is an ongoing ranked competition. Bots earn ratings based on wins and
            losses. Use the <strong>Compete</strong> tab to create a ladder and challenge
            other entries.
          </p>
        </section>

        <section className="doc-section">
          <h2>Tournaments</h2>
          <p>
            Tournaments run a full bracket in one go — round-robin, single-elimination, or
            double-elimination. Go to the <strong>Compete</strong> tab, create a tournament,
            add bots, and run all pending matches.
          </p>
        </section>
      </DocPage>
    );
  }
  ```

  Note: this file needs `import React from "react"` at the top (or the JSX transform handles it — check `tsconfig.json` for `"jsx": "react-jsx"` which means no import needed).

- [ ] **Step 2: Add the React import at the top of DocPage.tsx**

  Check `apps/web/src/tsconfig.json` or `apps/web/tsconfig.json` for `"jsx"`. If it is `"react-jsx"` (Vite default), no import is needed. The file should start with no import (Vite/React 19 automatic JSX transform is used — consistent with how `App.tsx` has no React import).

- [ ] **Step 3: Typecheck**

  ```bash
  cd apps/web && npm run check
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/src/DocPage.tsx
  git commit -m "feat: add DocPage layout and CreatingBotsPage/RunningBotsPage components"
  ```

---

## Task 3: Add landing page CSS to styles.css

**Files:**
- Modify: `apps/web/src/styles.css` (append to end of file, before the closing `@media` block)

- [ ] **Step 1: Append landing page and doc page CSS**

  Add the following at the **end** of `apps/web/src/styles.css` (after line 902, after the existing `@media (max-width: 900px)` block):

  ```css
  /* ══════════════════════════════
     LANDING PAGE
  ══════════════════════════════ */
  .landing-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 15px;
  }

  .landing-left {
    flex: 0 0 55%;
    overflow-y: auto;
    height: 100vh;
    padding: 64px 56px 64px 64px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    border-right: 1px solid var(--border);
  }

  .landing-right {
    flex: 0 0 45%;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  /* ── Hero ── */
  .landing-wordmark {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.4rem;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .landing-tagline {
    font-size: 1.35rem;
    font-weight: 600;
    color: var(--text);
    line-height: 1.3;
  }

  .landing-description {
    font-size: 15px;
    color: var(--text-dim);
    line-height: 1.65;
  }

  .landing-attribution {
    font-size: 14px;
    color: var(--text-dim);
    margin-top: -16px;
  }

  .landing-attribution a {
    color: var(--accent2);
    text-decoration: none;
  }

  .landing-attribution a:hover {
    text-decoration: underline;
  }

  /* ── Feature chips ── */
  .landing-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

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

  /* ── How to play steps ── */
  .landing-steps {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .landing-steps-title {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .landing-step {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  .landing-step-num {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--surface2);
    border: 1px solid var(--border2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--accent2);
    margin-top: 1px;
  }

  .landing-step-body strong {
    display: block;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 2px;
  }

  .landing-step-body span {
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.5;
  }

  /* ── Doc links ── */
  .landing-links {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .landing-link {
    font-size: 15px;
    font-weight: 500;
    color: var(--accent2);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .landing-link:hover {
    text-decoration: underline;
  }

  /* ── Login form panel (right column) ── */
  .landing-form-wrap {
    width: 100%;
    max-width: 380px;
  }

  .landing-form-wrap .panel {
    box-shadow: var(--shadow);
  }

  /* ══════════════════════════════
     DOC PAGES
  ══════════════════════════════ */
  .doc-shell {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, sans-serif;
    padding: 48px 24px 80px;
  }

  .doc-content {
    max-width: 720px;
    margin: 0 auto;
  }

  .doc-back {
    display: inline-block;
    font-size: 14px;
    font-weight: 500;
    color: var(--accent2);
    text-decoration: none;
    margin-bottom: 32px;
  }

  .doc-back:hover {
    text-decoration: underline;
  }

  .doc-content h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 40px;
    line-height: 1.2;
  }

  .doc-section {
    margin-bottom: 40px;
  }

  .doc-section h2 {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .doc-section h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-dim);
    margin: 20px 0 8px;
  }

  .doc-section p {
    font-size: 16px;
    color: var(--text-dim);
    line-height: 1.7;
    margin-bottom: 12px;
  }

  .doc-section ol,
  .doc-section ul {
    padding-left: 24px;
    margin-bottom: 12px;
  }

  .doc-section li {
    font-size: 16px;
    color: var(--text-dim);
    line-height: 1.7;
    margin-bottom: 4px;
  }

  .doc-section strong {
    color: var(--text);
    font-weight: 600;
  }

  .doc-code {
    display: block;
    background: var(--code-bg);
    border: 1px solid var(--code-border);
    border-radius: 8px;
    padding: 16px 18px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre;
    margin-bottom: 8px;
  }

  .doc-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 15px;
  }

  .doc-table th {
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border2);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .doc-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    color: var(--text-dim);
    vertical-align: top;
  }

  .doc-table code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    background: var(--code-bg);
    border: 1px solid var(--code-border);
    border-radius: 4px;
    padding: 1px 5px;
  }

  .doc-section code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    background: var(--code-bg);
    border: 1px solid var(--code-border);
    border-radius: 4px;
    padding: 1px 5px;
    color: var(--text-dim);
  }

  .doc-footer-link {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    font-size: 15px;
  }

  .doc-footer-link a {
    color: var(--accent2);
    text-decoration: none;
    font-weight: 500;
  }

  .doc-footer-link a:hover {
    text-decoration: underline;
  }

  /* ── Landing + doc responsive ── */
  @media (max-width: 700px) {
    .landing-shell {
      flex-direction: column;
      height: auto;
      overflow: auto;
    }

    .landing-left {
      flex: none;
      height: auto;
      overflow: visible;
      padding: 40px 24px 32px;
      border-right: none;
      border-bottom: 1px solid var(--border);
    }

    .landing-right {
      flex: none;
      height: auto;
      padding: 32px 24px 48px;
      justify-content: flex-start;
    }

    .landing-form-wrap {
      max-width: 100%;
    }

    .landing-wordmark {
      font-size: 1.8rem;
    }

    .doc-shell {
      padding: 32px 20px 60px;
    }
  }
  ```

- [ ] **Step 2: Verify the CSS file parses cleanly by running the dev server briefly**

  ```bash
  cd apps/web && npm run build 2>&1 | tail -5
  ```
  Expected: build completes without CSS errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/styles.css
  git commit -m "feat: add landing page and doc page CSS"
  ```

---

## Task 4: Wire up landing page JSX in App.tsx

**Files:**
- Modify: `apps/web/src/App.tsx`
  - Import `CreatingBotsPage` and `RunningBotsPage` from `./DocPage.js`
  - Replace the `if (!currentUser)` block (lines 961–1009) with routing-aware render logic
  - Wrap the login form in the new landing layout

- [ ] **Step 1: Add import for DocPage components**

  Add to the imports at the top of `App.tsx` (after the `ReplayViewer` import, line 45):

  ```tsx
  import { CreatingBotsPage, RunningBotsPage } from "./DocPage.js";
  ```

- [ ] **Step 2: Replace the routing-unaware render block**

  The current code at lines 961–1010 is:

  ```tsx
  if (!currentUser) {
    return (
      <div className="shell">
        ...login panel...
      </div>
    );
  }

  return (
    <div className="shell">
      ...full app...
    </div>
  );
  ```

  Replace the entire section from `if (!currentUser) {` through the closing `}` of that block (lines 961–1010) with:

  ```tsx
  // Doc pages render for all users (authenticated or not)
  if (currentRoute === "docs-creating-bots") {
    return <CreatingBotsPage onNavigate={navigate} />;
  }
  if (currentRoute === "docs-running-bots") {
    return <RunningBotsPage onNavigate={navigate} />;
  }

  // Landing page for unauthenticated users
  if (!currentUser) {
    return (
      <div className="landing-shell">
        {/* ── Left: Marketing ── */}
        <div className="landing-left">
          <div className="landing-wordmark">
            <span>🤖</span>
            <span>PCRobots</span>
          </div>

          <p className="landing-tagline">Write code. Build robots. Fight.</p>

          <p className="landing-description">
            PCRobots is a competitive programming game inspired by the classic
            DOS battle-bot arena originally created by PD Smith in the early
            1990s. You write AI code in any of 5 languages — your robot fights
            for survival against others in real time.
          </p>

          <p className="landing-attribution">
            Based on the original PCRobots by{" "}
            <a
              href="https://www.pscs.co.uk/pcrobots/index.php"
              target="_blank"
              rel="noopener noreferrer"
            >
              PD Smith
            </a>{" "}
            (early 1990s)
          </p>

          <div className="landing-chips">
            <span className="landing-chip">5 languages</span>
            <span className="landing-chip">Live replays</span>
            <span className="landing-chip">Ladders</span>
            <span className="landing-chip">Tournaments</span>
          </div>

          <div className="landing-steps">
            <div className="landing-steps-title">How to play</div>
            <div className="landing-step">
              <div className="landing-step-num">1</div>
              <div className="landing-step-body">
                <strong>Write a bot</strong>
                <span>Code your robot's AI in JavaScript, TypeScript, Python, Lua, or upload a Linux binary</span>
              </div>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">2</div>
              <div className="landing-step-body">
                <strong>Pick an arena</strong>
                <span>Choose a battlefield with walls, hazards, refuel zones, and damage traps</span>
              </div>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">3</div>
              <div className="landing-step-body">
                <strong>Battle</strong>
                <span>Run matches, climb ladder rankings, or compete in elimination tournaments</span>
              </div>
            </div>
          </div>

          <div className="landing-links">
            <a
              className="landing-link"
              href="/docs/creating-bots"
              onClick={(e) => { e.preventDefault(); navigate("/docs/creating-bots"); }}
            >
              Bot creation guide →
            </a>
            <a
              className="landing-link"
              href="/docs/running-bots"
              onClick={(e) => { e.preventDefault(); navigate("/docs/running-bots"); }}
            >
              Running a match →
            </a>
          </div>
        </div>

        {/* ── Right: Login form ── */}
        <div className="landing-right">
          <div className="landing-form-wrap">
            <section className="panel" data-testid="login-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Access</p>
                  <h2>Sign In</h2>
                </div>
              </div>
              {error ? <span className="message error">{error}</span> : null}
              {message ? <span className="message success">{message}</span> : null}
              <form onSubmit={(e) => { e.preventDefault(); void handleLogin(); }}>
                <div className="form-grid">
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="button-cluster">
                  <button className="primary-button" type="submit" disabled={submitting || loading}>
                    {loading ? "Checking…" : "Sign in"}
                  </button>
                  <button className="ghost-button" type="button" onClick={() => void handleRegister()} disabled={submitting || loading}>
                    Create account
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 3: Typecheck**

  ```bash
  cd apps/web && npm run check
  ```
  Expected: no errors.

- [ ] **Step 4: Build**

  ```bash
  cd apps/web && npm run build
  ```
  Expected: build succeeds.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/src/App.tsx
  git commit -m "feat: replace login panel with split-screen landing page and doc routes"
  ```

---

## Task 5: Manual verification

No automated browser tests exist for this project. Verify visually using the dev server.

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

  ```bash
  cd apps/web && npm run dev
  ```

- [ ] **Step 2: Verify landing page (unauthenticated)**

  Open `http://localhost:5173/` in a browser (clear any stored auth token first — open DevTools → Application → Session Storage → delete `pcrobots-auth-token`).

  Check:
  - Left column visible with wordmark, tagline, description, attribution, chips, steps, doc links
  - Right column shows login form with "Sign in" / "Create account" buttons
  - Attribution link text is present and opens the pscs.co.uk URL in a new tab
  - On window resize to ≤700px: columns stack, left on top, right below

- [ ] **Step 3: Verify doc pages**

  Navigate to `http://localhost:5173/docs/creating-bots`:
  - "Creating a Bot" page renders with all sections
  - "← PCRobots" link at top returns to `/`
  - "Next: Running a match →" footer link navigates to `/docs/running-bots`
  - Browser back button returns to previous page

  Navigate to `http://localhost:5173/docs/running-bots`:
  - "Running a Match" page renders
  - "← Back: Creating a bot" footer link navigates to `/docs/creating-bots`

  Navigate to `http://localhost:5173/docs/running-bots` while **signed in**:
  - Doc page renders (not redirected to app)
  - "← PCRobots" navigates to `/` which then shows the app shell

- [ ] **Step 4: Verify light theme**

  Toggle to light theme via the app (or `document.documentElement.setAttribute('data-theme','light')` in DevTools console on the landing page). Check that:
  - Text is readable throughout
  - Links use the darker indigo (`--accent2` = `#4f46e5` in light mode)
  - Chips are legible

- [ ] **Step 5: Verify document.title**

  - `/` → tab title is "PCRobots"
  - `/docs/creating-bots` → "Creating a Bot — PCRobots"
  - `/docs/running-bots` → "Running a Match — PCRobots"

- [ ] **Step 6: Commit verification note**

  ```bash
  git commit --allow-empty -m "chore: verify landing page and doc routes visually"
  ```

---

## Task 6: Create PR

- [ ] **Step 1: Push branch and open PR**

  ```bash
  git checkout -b feat/landing-page
  git push -u origin feat/landing-page
  gh pr create \
    --title "feat: split-screen landing page with doc routes" \
    --body "$(cat <<'EOF'
  ## Summary

  - Replaces minimal login panel with a split-screen landing page (marketing left, login right)
  - Adds `/docs/creating-bots` and `/docs/running-bots` in-SPA routes (no routing library)
  - Attribution to original PCRobots by PD Smith (early 1990s)
  - All text meets WCAG AA contrast — links use \`--accent2\` (≥5.8:1), small text uses \`--text-dim\`
  - New \`DocPage.tsx\` component following existing \`CodeEditor.tsx\`/\`ReplayViewer.tsx\` pattern

  ## Test Plan
  - [ ] Landing page renders with all marketing content when logged out
  - [ ] Login/register form works from the right column
  - [ ] Doc pages render at correct URLs for both authenticated and unauthenticated users
  - [ ] Back button and doc cross-links navigate correctly
  - [ ] Light theme contrast is adequate throughout
  - [ ] Mobile layout stacks correctly at ≤700px
  - [ ] \`document.title\` updates on route change
  - [ ] \`npm run check\` and \`npm run build\` pass
  EOF
  )"
  ```
