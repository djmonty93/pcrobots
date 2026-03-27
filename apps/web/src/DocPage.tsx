import type { ReactNode } from "react";

interface DocPageProps {
  title: string;
  children: ReactNode;
  footerLink: ReactNode;
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
