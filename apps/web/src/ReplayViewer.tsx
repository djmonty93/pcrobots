import { useEffect, useMemo, useState } from "react";

import type { MatchEvent, MatchRecord } from "./api.js";

interface ReplayViewerProps {
  match: MatchRecord | null;
}

interface ReplayRobot {
  id: string;
  x: number;
  y: number;
  teamId: string | null;
  alive: boolean;
  invisible: boolean;
  obstacleState: string;
}

interface ReplayShell {
  id: string;
  x: number;
  y: number;
}

interface ScanOverlay {
  robotId: string;
  x: number;
  y: number;
  heading: number;
  resolution: number;
  range: number;
}

interface ExplosionOverlay {
  shellId: string;
  x: number;
  y: number;
  outcome: string | null;
}

interface FireOverlay {
  robotId: string;
  x: number;
  y: number;
  heading: number;
  range: number;
}

interface ReplayFrame {
  tick: number;
  robots: ReplayRobot[];
  shells: ReplayShell[];
  scans: ScanOverlay[];
  explosions: ExplosionOverlay[];
  fireLines: FireOverlay[];
  damagedRobotIds: string[];
  collisionRobotIds: string[];
  events: MatchEvent[];
}

function cloneRobots(robots: Map<string, ReplayRobot>): ReplayRobot[] {
  return Array.from(robots.values()).map((robot) => ({ ...robot }));
}

function cloneShells(shells: Map<string, ReplayShell>): ReplayShell[] {
  return Array.from(shells.values()).map((shell) => ({ ...shell }));
}

function toNumber(value: string | number | boolean | null | undefined): number | null {
  return typeof value === "number" ? value : null;
}

function toStringValue(value: string | number | boolean | null | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function toBoolean(value: string | number | boolean | null | undefined): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function polarPoint(x: number, y: number, angle: number, distance: number): { x: number; y: number } {
  const radians = (angle - 90) * (Math.PI / 180);
  return {
    x: x + Math.cos(radians) * distance,
    y: y + Math.sin(radians) * distance
  };
}

function describeOutcome(outcome: string | null): string {
  switch (outcome) {
    case "direct_hit":
      return "direct hit";
    case "near_miss":
      return "near miss";
    case "close_blast":
      return "close blast";
    case "hit_wall":
      return "hit wall";
    case "missed":
      return "missed";
    default:
      return outcome ?? "resolved";
  }
}

function sectorPath(x: number, y: number, heading: number, resolution: number, radius: number): string {
  const left = polarPoint(x, y, heading - resolution, radius);
  const right = polarPoint(x, y, heading + resolution, radius);
  const largeArc = resolution * 2 > 180 ? 1 : 0;
  return `M ${x} ${y} L ${left.x} ${left.y} A ${radius} ${radius} 0 ${largeArc} 1 ${right.x} ${right.y} Z`;
}

function parseArenaCells(arenaText: string): Array<{ x: number; y: number; kind: string }> {
  const lines = arenaText.split(/\r?\n/);
  const cells: Array<{ x: number; y: number; kind: string }> = [];

  for (let y = 0; y < lines.length; y += 1) {
    const line = lines[y] ?? "";
    for (let x = 0; x < line.length; x += 1) {
      const kind = line[x] ?? ".";
      if (kind !== ".") {
        cells.push({ x, y, kind });
      }
    }
  }

  return cells;
}

function buildReplayFrames(match: MatchRecord): ReplayFrame[] {
  const events = [...(match.events ?? [])].sort((left, right) => left.tick - right.tick);
  const robots = new Map<string, ReplayRobot>();
  const shells = new Map<string, ReplayShell>();
  const frames: ReplayFrame[] = [];
  const maxTick = events.reduce((highest, event) => Math.max(highest, event.tick), 0);

  for (let tick = 0; tick <= maxTick; tick += 1) {
    const tickEvents = events.filter((event) => event.tick === tick);
    const scans: ScanOverlay[] = [];
    const explosions: ExplosionOverlay[] = [];
    const fireLines: FireOverlay[] = [];
    const damagedRobotIds: string[] = [];
    const collisionRobotIds: string[] = [];

    for (const event of tickEvents) {
      switch (event.type) {
        case "robot.spawned": {
          const robotId = toStringValue(event.payload.robotId);
          const x = toNumber(event.payload.x);
          const y = toNumber(event.payload.y);
          if (!robotId || x === null || y === null) {
            break;
          }

          robots.set(robotId, {
            id: robotId,
            x,
            y,
            teamId: toStringValue(event.payload.teamId),
            alive: true,
            invisible: false,
            obstacleState: "none"
          });
          break;
        }
        case "robot.moved": {
          const robotId = toStringValue(event.payload.robotId);
          const x = toNumber(event.payload.x);
          const y = toNumber(event.payload.y);
          if (!robotId || x === null || y === null) {
            break;
          }

          const robot = robots.get(robotId);
          if (robot) {
            robot.x = x;
            robot.y = y;
          }
          break;
        }
        case "robot.destroyed": {
          const robotId = toStringValue(event.payload.robotId);
          if (!robotId) {
            break;
          }

          const robot = robots.get(robotId);
          if (robot) {
            robot.alive = false;
            robot.invisible = false;
          }
          break;
        }
        case "robot.invisibility_changed": {
          const robotId = toStringValue(event.payload.robotId);
          const enabled = toBoolean(event.payload.enabled);
          if (!robotId || enabled === null) {
            break;
          }

          const robot = robots.get(robotId);
          if (robot) {
            robot.invisible = enabled;
          }
          break;
        }
        case "robot.obstacle_state_changed": {
          const robotId = toStringValue(event.payload.robotId);
          const obstacleState = toStringValue(event.payload.obstacleState);
          if (!robotId || !obstacleState) {
            break;
          }

          const robot = robots.get(robotId);
          if (robot) {
            robot.obstacleState = obstacleState;
          }
          break;
        }
        case "robot.scanned": {
          const robotId = toStringValue(event.payload.robotId);
          const heading = toNumber(event.payload.heading);
          const resolution = toNumber(event.payload.resolution);
          if (!robotId || heading === null || resolution === null) {
            break;
          }

          const robot = robots.get(robotId);
          if (!robot) {
            break;
          }

          const scanRange = Math.max(toNumber(event.payload.range) ?? 0, 0);
          scans.push({
            robotId,
            x: robot.x,
            y: robot.y,
            heading,
            resolution,
            range: scanRange > 0 ? scanRange : 120
          });
          break;
        }
        case "robot.fired": {
          const shellId = toNumber(event.payload.shellId);
          const robotId = toStringValue(event.payload.robotId);
          const heading = toNumber(event.payload.heading);
          const range = toNumber(event.payload.range);
          const robot = robotId ? robots.get(robotId) : null;
          if (shellId === null || !robot) {
            break;
          }

          shells.set(String(shellId), {
            id: String(shellId),
            x: robot.x,
            y: robot.y
          });

          if (heading !== null && range !== null) {
            fireLines.push({
              robotId: robot.id,
              x: robot.x,
              y: robot.y,
              heading,
              range
            });
          }
          break;
        }
        case "shell.moved": {
          const shellId = toNumber(event.payload.shellId);
          const x = toNumber(event.payload.x);
          const y = toNumber(event.payload.y);
          if (shellId === null || x === null || y === null) {
            break;
          }

          const shell = shells.get(String(shellId));
          if (shell) {
            shell.x = x;
            shell.y = y;
          }
          break;
        }
        case "shell.resolved": {
          const shellId = toNumber(event.payload.shellId);
          if (shellId === null) {
            break;
          }

          const shell = shells.get(String(shellId));
          explosions.push({
            shellId: String(shellId),
            x: shell?.x ?? 0,
            y: shell?.y ?? 0,
            outcome: toStringValue(event.payload.outcome)
          });
          shells.delete(String(shellId));
          break;
        }
        case "robot.damaged": {
          const robotId = toStringValue(event.payload.robotId);
          if (robotId) {
            damagedRobotIds.push(robotId);
          }
          break;
        }
        case "robot.collision": {
          const robotId = toStringValue(event.payload.robotId);
          if (robotId) {
            collisionRobotIds.push(robotId);
          }
          break;
        }
        default:
          break;
      }
    }

    frames.push({
      tick,
      robots: cloneRobots(robots),
      shells: cloneShells(shells),
      scans,
      explosions,
      fireLines,
      damagedRobotIds,
      collisionRobotIds,
      events: tickEvents
    });
  }

  return frames;
}

function describeEvent(event: MatchEvent): string {
  switch (event.type) {
    case "robot.scanned":
      return `${event.payload.robotId} scanned ${event.payload.detectedRobotId ?? "nothing"} at range ${event.payload.range}`;
    case "robot.fired":
      return `${event.payload.robotId} fired shell ${event.payload.shellId}`;
    case "shell.resolved":
      return `shell ${event.payload.shellId} ${describeOutcome(toStringValue(event.payload.outcome))}`;
    case "robot.damaged":
      return `${event.payload.robotId} took ${event.payload.amount} damage`;
    case "robot.collision":
      return `${event.payload.robotId} collided with ${event.payload.cause}`;
    case "robot.invisibility_changed":
      return `${event.payload.robotId} invisibility ${event.payload.enabled ? "enabled" : "disabled"}`;
    case "robot.obstacle_state_changed":
      return `${event.payload.robotId} obstacle state ${event.payload.obstacleState}`;
    case "robot.destroyed":
      return `${event.payload.robotId} was destroyed`;
    case "match.finished":
      return `match finished: ${event.payload.reason ?? "unknown"}`;
    default:
      return event.type;
  }
}

export function ReplayViewer({ match }: ReplayViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tick, setTick] = useState(0);

  const arenaCells = useMemo(() => parseArenaCells(match?.arenaText ?? ""), [match?.arenaText]);
  const frames = useMemo(() => (match ? buildReplayFrames(match) : []), [match]);
  const currentFrame = frames[Math.min(tick, Math.max(frames.length - 1, 0))] ?? null;
  const maxTick = Math.max(frames.length - 1, 0);

  useEffect(() => {
    setTick(0);
    setIsPlaying(false);
  }, [match?.id]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setTick((current) => {
        if (current >= maxTick) {
          setIsPlaying(false);
          return current;
        }

        return current + 1;
      });
    }, 200);

    return () => window.clearInterval(timer);
  }, [frames.length, isPlaying, maxTick]);

  if (!match) {
    return (
      <section className="panel replay-panel empty-panel">
        <h2>Replay Viewer</h2>
        <p>Select a stored match to inspect the arena timeline.</p>
      </section>
    );
  }

  return (
    <section className="panel replay-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Replay</p>
          <h2>{match.name}</h2>
        </div>
        <div className="replay-status-group">
          <span className={`status-pill status-${match.status}`}>{match.status}</span>
          <span className="status-pill subtle">{match.mode}</span>
        </div>
      </div>

      <div className="replay-meta">
        <span>arena: {match.arenaName}</span>
        <span>seed: {match.seed}</span>
        <span>winner: {match.result?.winnerRobotId ?? match.result?.winnerTeamId ?? "pending"}</span>
      </div>

      <div className="arena-stage">
        <svg viewBox="0 0 1000 1000" role="img" aria-label="Replay arena view">
          <rect x="0" y="0" width="1000" height="1000" fill="#f6f2e8" rx="28" />
          {arenaCells.map((cell) => {
            const x = cell.x * 10;
            const y = cell.y * 10;
            const fill =
              cell.kind === "X"
                ? "#243241"
                : cell.kind === "*"
                  ? "#8d6e2b"
                  : cell.kind === "R"
                    ? "#287a55"
                    : cell.kind === "S"
                      ? "#8aa1b6"
                      : cell.kind === "D"
                        ? "#bf5d43"
                        : cell.kind === "A" || cell.kind === "B" || cell.kind === "C"
                          ? "#c8b27d"
                          : "#d9d2c1";
            return <rect key={`${cell.x}-${cell.y}-${cell.kind}`} x={x} y={y} width="10" height="10" fill={fill} />;
          })}

          {currentFrame?.scans.map((scan) => (
            <path
              key={`${scan.robotId}-${scan.heading}-${scan.resolution}`}
              d={sectorPath(scan.x / 100, scan.y / 100, normalizeDegrees(scan.heading), Math.max(scan.resolution, 3), scan.range)}
              fill="rgba(45, 111, 213, 0.12)"
              stroke="rgba(45, 111, 213, 0.36)"
              strokeWidth="1.5"
            />
          ))}

          {currentFrame?.fireLines.map((fire) => {
            const target = polarPoint(fire.x / 100, fire.y / 100, normalizeDegrees(fire.heading), Math.min(fire.range, 160));
            return (
              <line
                key={`${fire.robotId}-${fire.heading}-${fire.range}`}
                x1={fire.x / 100}
                y1={fire.y / 100}
                x2={target.x}
                y2={target.y}
                stroke="rgba(213, 138, 45, 0.5)"
                strokeWidth="2"
                strokeDasharray="8 6"
              />
            );
          })}

          {currentFrame?.shells.map((shell) => (
            <circle key={shell.id} cx={shell.x / 100} cy={shell.y / 100} r="4" fill="#1d6fd6" opacity="0.8" />
          ))}

          {currentFrame?.explosions.map((explosion) => (
            <g key={`${explosion.shellId}-${explosion.outcome}`}>
              <circle cx={explosion.x / 100} cy={explosion.y / 100} r="12" fill="rgba(191, 93, 67, 0.22)" />
              <circle cx={explosion.x / 100} cy={explosion.y / 100} r="6" fill="rgba(213, 138, 45, 0.35)" />
            </g>
          ))}

          {currentFrame?.robots.map((robot) => {
            const isDamaged = currentFrame.damagedRobotIds.includes(robot.id);
            const hadCollision = currentFrame.collisionRobotIds.includes(robot.id);
            return (
              <g key={robot.id} opacity={robot.alive ? (robot.invisible ? 0.35 : 1) : 0.2}>
                {robot.obstacleState !== "none" ? (
                  <circle
                    cx={robot.x / 100}
                    cy={robot.y / 100}
                    r={robot.obstacleState === "holding" ? 16 : 14}
                    fill="none"
                    stroke={robot.obstacleState === "holding" ? "#8d6e2b" : "#c8b27d"}
                    strokeWidth="2"
                    strokeDasharray={robot.obstacleState === "holding" ? "3 3" : undefined}
                  />
                ) : null}
                {isDamaged ? <circle cx={robot.x / 100} cy={robot.y / 100} r="18" fill="rgba(191, 93, 67, 0.18)" /> : null}
                {hadCollision ? <circle cx={robot.x / 100} cy={robot.y / 100} r="20" fill="rgba(36, 50, 65, 0.12)" /> : null}
                <circle
                  cx={robot.x / 100}
                  cy={robot.y / 100}
                  r="11"
                  fill={robot.teamId === "A" ? "#d58a2d" : robot.teamId === "B" ? "#2d6fd5" : "#287a55"}
                  stroke={robot.invisible ? "#8aa1b6" : "#17212b"}
                  strokeWidth="2"
                />
                <text x={robot.x / 100} y={robot.y / 100 + 4} textAnchor="middle" fontSize="9" fill="#fdf7ec">
                  {robot.id.slice(0, 1).toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="timeline-controls">
        <button className="ghost-button" type="button" onClick={() => setIsPlaying((current) => !current)}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input type="range" min={0} max={maxTick} value={tick} onChange={(event) => setTick(Number(event.target.value))} />
        <span className="tick-badge">tick {currentFrame?.tick ?? 0}</span>
      </div>

      <div className="tick-events">
        <h3>Tick Events</h3>
        {currentFrame && currentFrame.events.length > 0 ? (
          <ul>
            {currentFrame.events.map((event, index) => (
              <li key={`${event.tick}-${event.type}-${index}`}>{describeEvent(event)}</li>
            ))}
          </ul>
        ) : (
          <p>No events recorded for this tick.</p>
        )}
      </div>
    </section>
  );
}

