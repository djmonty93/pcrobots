import { startTransition, useEffect, useMemo, useState } from "react";

import {
  challengeLadder,
  createArena,
  createBot,
  createLadder,
  createMatch,
  createTournament,
  listArenas,
  listBots,
  listLadders,
  listMatches,
  listTournaments,
  runTournamentMatches,
  type ArenaRecord,
  type BotRecord,
  type LadderRecord,
  type MatchMode,
  type MatchRecord,
  type SupportedLanguage,
  type TournamentFormat,
  type TournamentRecord
} from "./api.js";
import { CodeEditor } from "./CodeEditor.js";
import { ReplayViewer } from "./ReplayViewer.js";

const defaultBotTemplates: Record<SupportedLanguage, string> = {
  javascript: `module.exports = function onTurn(snapshot) {
  if (snapshot.tick === 0) return { kind: "scan", heading: 0, resolution: 12 };
  if (snapshot.tick === 1) return { kind: "shoot", heading: 0, range: 45 };
  return { kind: "movement", targetSpeed: 35, heading: 0 };
};
`,
  typescript: `type TurnSnapshot = {
  tick: number;
};

export = function onTurn(snapshot: TurnSnapshot) {
  if (snapshot.tick === 0) return { kind: "scan", heading: 0, resolution: 10 };
  return { kind: "movement", targetSpeed: 30, heading: 0 };
};
`,
  python: `from typing import Any

def on_turn(snapshot: dict[str, Any]):
    if snapshot["tick"] == 0:
        return {"kind": "scan", "heading": 0, "resolution": 10}
    return {"kind": "movement", "targetSpeed": 30, "heading": 0}
`
};

function createSampleArenaText(): string {
  const lines = Array.from({ length: 100 }, () => ".".repeat(100));
  lines[12] = `A${".".repeat(17)}*${".".repeat(17)}R${".".repeat(62)}B`;
  lines[28] = `${".".repeat(24)}XXX${".".repeat(73)}`;
  lines[41] = `${".".repeat(10)}S${".".repeat(30)}D${".".repeat(58)}`;
  lines[74] = `${".".repeat(48)}***${".".repeat(49)}`;
  return lines.join("\n");
}

function createInitialBotState() {
  return {
    name: "Scout Alpha",
    description: "First browser-authored bot",
    language: "javascript" as SupportedLanguage,
    source: defaultBotTemplates.javascript
  };
}

function createInitialArenaState() {
  return {
    name: "Foundry Floor",
    description: "Starter arena with cover and hazards",
    text: createSampleArenaText()
  };
}

function createInitialMatchState() {
  return {
    name: "Exhibition Match",
    mode: "live" as MatchMode,
    arenaId: "",
    teamABotId: "",
    teamBBotId: "",
    seed: 7,
    maxTicks: 120,
    enqueue: false
  };
}

function createInitialLadderState() {
  return {
    name: "Foundry Ladder",
    description: "Continuous rating table",
    arenaId: "",
    maxTicks: 150,
    entryBotIds: [] as string[]
  };
}

function createInitialTournamentState() {
  return {
    name: "Foundry Cup",
    description: "Scheduled competition bracket",
    format: "round-robin" as TournamentFormat,
    arenaId: "",
    maxTicks: 150,
    seedBase: 100,
    entryBotIds: [] as string[]
  };
}

function toggleSelection(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function BotChecklist(props: {
  bots: BotRecord[];
  selectedBotIds: string[];
  onToggle: (botId: string) => void;
}) {
  return (
    <div className="bot-checklist">
      {props.bots.length > 0 ? (
        props.bots.map((bot) => (
          <label key={bot.id} className="bot-pill">
            <input
              type="checkbox"
              checked={props.selectedBotIds.includes(bot.id)}
              onChange={() => props.onToggle(bot.id)}
            />
            <span>{bot.name}</span>
            <small>{bot.latestRevision.language}</small>
          </label>
        ))
      ) : (
        <p className="muted">Create bots first.</p>
      )}
    </div>
  );
}

function getRoundStateCounts(tournament: TournamentRecord, roundId: string) {
  const round = tournament.rounds.find((entry) => entry.id === roundId);
  const counts = { total: 0, completed: 0, pending: 0, queued: 0, running: 0, failed: 0 };
  if (!round) {
    return counts;
  }

  for (const match of round.matches) {
    counts.total += 1;
    switch (match.status) {
      case "completed":
        counts.completed += 1;
        break;
      case "pending":
        counts.pending += 1;
        break;
      case "queued":
        counts.queued += 1;
        break;
      case "running":
        counts.running += 1;
        break;
      case "failed":
        counts.failed += 1;
        break;
    }
  }

  return counts;
}

function getTournamentStatusLine(tournament: TournamentRecord): string {
  if (tournament.summary.championBotName) {
    return `Champion: ${tournament.summary.championBotName}`;
  }

  if (tournament.summary.leaderBotName) {
    return `Leader: ${tournament.summary.leaderBotName}`;
  }

  return "No leader yet";
}

export function App() {
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [arenas, setArenas] = useState<ArenaRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [ladders, setLadders] = useState<LadderRecord[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [botForm, setBotForm] = useState(createInitialBotState);
  const [arenaForm, setArenaForm] = useState(createInitialArenaState);
  const [matchForm, setMatchForm] = useState(createInitialMatchState);
  const [ladderForm, setLadderForm] = useState(createInitialLadderState);
  const [tournamentForm, setTournamentForm] = useState(createInitialTournamentState);

  async function refreshData(preferredMatchId?: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const [nextBots, nextArenas, nextMatches, nextLadders, nextTournaments] = await Promise.all([
        listBots(),
        listArenas(),
        listMatches(),
        listLadders(),
        listTournaments()
      ]);

      startTransition(() => {
        setBots(nextBots);
        setArenas(nextArenas);
        setMatches(nextMatches);
        setLadders(nextLadders);
        setTournaments(nextTournaments);

        setMatchForm((current) => ({
          ...current,
          arenaId: current.arenaId || nextArenas[0]?.id || "",
          teamABotId: current.teamABotId || nextBots[0]?.id || "",
          teamBBotId: current.teamBBotId || nextBots[1]?.id || nextBots[0]?.id || ""
        }));

        setLadderForm((current) => ({
          ...current,
          arenaId: current.arenaId || nextArenas[0]?.id || "",
          entryBotIds: current.entryBotIds.length > 0 ? current.entryBotIds : nextBots.slice(0, 2).map((bot) => bot.id)
        }));

        setTournamentForm((current) => ({
          ...current,
          arenaId: current.arenaId || nextArenas[0]?.id || "",
          entryBotIds:
            current.entryBotIds.length > 0 ? current.entryBotIds : nextBots.slice(0, Math.min(4, nextBots.length)).map((bot) => bot.id)
        }));

        setSelectedMatchId(preferredMatchId ?? selectedMatchId ?? nextMatches[0]?.id ?? null);
      });
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? null,
    [matches, selectedMatchId]
  );

  async function handleCreateBot(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const bot = await createBot(botForm);
      setMessage(`Saved ${bot.name}`);
      await refreshData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateArena(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const arena = await createArena(arenaForm);
      setMessage(`Saved arena ${arena.name}`);
      await refreshData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateMatch(): Promise<void> {
    if (!matchForm.arenaId || !matchForm.teamABotId || !matchForm.teamBBotId) {
      setError("Select an arena and two bots before creating a match.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await createMatch({
        name: matchForm.name,
        mode: matchForm.mode,
        arenaId: matchForm.arenaId,
        seed: matchForm.seed,
        maxTicks: matchForm.maxTicks,
        enqueue: matchForm.enqueue,
        participants: [
          { botId: matchForm.teamABotId, teamId: "A" },
          { botId: matchForm.teamBBotId, teamId: "B" }
        ]
      });

      setMessage(matchForm.mode === "queued" || matchForm.enqueue ? "Queued match run" : "Stored and ran match");
      await refreshData(response.match.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateLadder(): Promise<void> {
    if (!ladderForm.arenaId || ladderForm.entryBotIds.length < 2) {
      setError("Pick an arena and at least two bots for the ladder.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const ladder = await createLadder(ladderForm);
      setMessage(`Created ladder ${ladder.name}`);
      await refreshData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLadderChallenge(ladderId: string): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await challengeLadder(ladderId, {
        seed: Date.now() % 100000,
        enqueue: false
      });
      setMessage("Ran ladder challenge");
      await refreshData(response.match.id);
    } catch (challengeError) {
      setError(challengeError instanceof Error ? challengeError.message : String(challengeError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateTournament(): Promise<void> {
    if (!tournamentForm.arenaId || tournamentForm.entryBotIds.length < 2) {
      setError("Pick an arena and at least two bots for the tournament.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const tournament = await createTournament(tournamentForm);
      setMessage(`Created tournament ${tournament.name}`);
      await refreshData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRunTournament(
    tournamentId: string,
    options: { enqueue: boolean; limit?: number; roundId?: string }
  ): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await runTournamentMatches(tournamentId, options);
      const actionLabel = options.enqueue ? "Enqueued" : "Ran";
      const scopeLabel = options.limit === 1 ? "next pending tournament match" : "pending tournament matches";
      setMessage(`${actionLabel} ${response.count} ${scopeLabel}`);
      await refreshData(response.processedMatchIds[0]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="background-grid" />
      <div className="app-frame">
        <header className="hero">
          <div>
            <p className="eyebrow">Faithful mechanics, modern platform</p>
            <h1>PCRobots Operations Deck</h1>
            <p className="hero-copy">
              Build bots, forge arenas, launch exhibition matches, track ladder standings, and schedule tournament rounds from one control surface.
            </p>
          </div>
          <div className="hero-stats stat-grid-wide">
            <div className="stat-card"><span className="stat-value">{bots.length}</span><span className="stat-label">bots</span></div>
            <div className="stat-card"><span className="stat-value">{arenas.length}</span><span className="stat-label">arenas</span></div>
            <div className="stat-card"><span className="stat-value">{matches.length}</span><span className="stat-label">matches</span></div>
            <div className="stat-card"><span className="stat-value">{ladders.length}</span><span className="stat-label">ladders</span></div>
            <div className="stat-card"><span className="stat-value">{tournaments.length}</span><span className="stat-label">tournaments</span></div>
          </div>
        </header>

        <div className="status-row">
          <button className="ghost-button" type="button" onClick={() => void refreshData()} disabled={loading || submitting}>
            {loading ? "Refreshing..." : "Refresh data"}
          </button>
          {message ? <span className="message success">{message}</span> : null}
          {error ? <span className="message error">{error}</span> : null}
        </div>

        <section className="dashboard-grid expanded-grid">
          <div className="stack-column">
            <section className="panel editor-panel">
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

            <section className="panel editor-panel">
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

          <div className="stack-column wide-column">
            <section className="panel match-panel">
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
                    onChange={(event) => setMatchForm((current) => ({ ...current, mode: event.target.value as MatchMode, enqueue: event.target.value === "queued" }))}
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

              <div className="form-grid three-up compact-row">
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
                {matchForm.enqueue || matchForm.mode === "queued" ? "Store and enqueue" : "Store and run now"}
              </button>
            </section>

            <ReplayViewer match={selectedMatch} />

            <section className="panel list-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Runs</p>
                  <h2>Stored Matches</h2>
                </div>
              </div>
              <div className="scroll-list compact-list">
                {matches.length > 0 ? matches.map((match) => (
                  <button key={match.id} className={`match-list-card${selectedMatchId === match.id ? " active" : ""}`} type="button" onClick={() => setSelectedMatchId(match.id)}>
                    <span className="match-title">{match.name}</span>
                    <span className="match-meta">{match.participants.map((participant) => participant.botName).join(" vs ")}</span>
                    <span className="match-meta">{match.status} · {match.mode}</span>
                  </button>
                )) : <p className="muted">No matches stored yet.</p>}
              </div>
            </section>
          </div>

          <div className="stack-column side-column">
            <section className="panel competition-panel">
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
                  <article key={ladder.id} className="list-card ladder-card">
                    <div className="card-toolbar">
                      <div>
                        <h3>{ladder.name}</h3>
                        <p>{ladder.description || "No description"}</p>
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

            <section className="panel competition-panel">
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
                  <article key={tournament.id} className="list-card tournament-card">
                    <div className="card-toolbar">
                      <div>
                        <h3>{tournament.name}</h3>
                        <p>{tournament.description || "No description"}</p>
                      </div>
                      <div className="button-cluster">
                        <button
                          className="ghost-button small-button"
                          type="button"
                          onClick={() => void handleRunTournament(tournament.id, { enqueue: false, limit: 1 })}
                          disabled={submitting || tournament.summary.pendingMatches === 0}
                        >
                          Run next
                        </button>
                        <button
                          className="ghost-button small-button"
                          type="button"
                          onClick={() => void handleRunTournament(tournament.id, { enqueue: false })}
                          disabled={submitting || tournament.summary.pendingMatches === 0}
                        >
                          Run all now
                        </button>
                        <button
                          className="ghost-button small-button"
                          type="button"
                          onClick={() => void handleRunTournament(tournament.id, { enqueue: true })}
                          disabled={submitting || tournament.summary.pendingMatches === 0}
                        >
                          Enqueue pending
                        </button>
                      </div>
                    </div>
                    <p className="match-meta">{tournament.format} · {tournament.entries.length} entrants · {tournament.arenaName}</p>
                    <div className="summary-grid">
                      <div className="summary-chip">
                        <strong>{tournament.summary.completedMatches}/{tournament.summary.totalMatches}</strong>
                        <small>completed</small>
                      </div>
                      <div className="summary-chip">
                        <strong>{tournament.summary.pendingMatches}</strong>
                        <small>pending</small>
                      </div>
                      <div className="summary-chip">
                        <strong>{tournament.summary.queuedMatches + tournament.summary.runningMatches}</strong>
                        <small>active</small>
                      </div>
                      <div className="summary-chip">
                        <strong>{tournament.summary.failedMatches}</strong>
                        <small>failed</small>
                      </div>
                    </div>
                    <p className="leader-line">{getTournamentStatusLine(tournament)}</p>
                    <ol className="standing-list compact-standing-list">
                      {tournament.standings.slice(0, 4).map((standing) => (
                        <li key={standing.tournamentEntryId}>
                          <span>#{standing.seed} {standing.botName}</span>
                          <span>{tournament.format === "round-robin" ? String(standing.points) + " pts" : standing.eliminated ? "out" : "alive"}</span>
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

            <section className="panel list-panel">
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
                    <p>{bot.description || "No description"}</p>
                    <span>{bot.latestRevision.language}</span>
                  </article>
                )) : <p className="muted">No bots stored yet.</p>}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
