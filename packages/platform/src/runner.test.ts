import test from "node:test";
import assert from "node:assert/strict";

import { createMatchState, parseArenaText, type MatchState } from "@pcrobots/engine";

import { type Database, type MatchParticipantRecord, type MatchRecord } from "./db.js";
import { applyEliminationTiebreak, executeStoredMatch } from "./runner.js";

function createParticipant(seed: number, teamId: "A" | "B", slot: number): MatchParticipantRecord {
  return {
    id: `participant-${seed}-${teamId}`,
    matchId: "match-1",
    botRevisionId: `rev-${seed}`,
    botId: `bot-${seed}`,
    botName: `Bot ${seed}`,
    language: "javascript",
    source: "module.exports = () => ({ kind: 'noop' });",
    revisionVersion: 1,
    teamId,
    slot
  };
}

function createMatch(mode: MatchRecord["mode"]): MatchRecord {
  const participants: [MatchParticipantRecord, MatchParticipantRecord] = [
    createParticipant(1, "A", 0),
    createParticipant(2, "B", 1)
  ];

  return {
    id: "match-1",
    name: "Review Match",
    mode,
    status: "completed",
    ladderId: null,
    tournamentId: null,
    tournamentRoundId: null,
    roundSlot: null,
    arenaRevisionId: "arena-rev-1",
    arenaId: "arena-1",
    arenaName: "Arena",
    arenaText: "A.................................................................................................B",
    seed: 1,
    maxTicks: 20,
    errorMessage: null,
    result: {
      finished: true,
      winnerRobotId: null,
      winnerTeamId: null,
      reason: "time_limit"
    },
    events: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    participants
  };
}

function createDrawnState(): MatchState {
  const arena = parseArenaText("A.................................................................................................B");
  const state = createMatchState({
    seed: 1,
    arena,
    entrants: [
      { id: "participant-1-A", name: "Bot 1", teamId: "A" },
      { id: "participant-2-B", name: "Bot 2", teamId: "B" }
    ]
  });

  state.result.finished = true;
  state.result.reason = "time_limit";
  state.result.winnerRobotId = null;
  state.result.winnerTeamId = null;
  return state;
}

test("applyEliminationTiebreak awards a deterministic winner for elimination draws", () => {
  const match = createMatch("single-elimination");
  const state = createDrawnState();
  const [alpha, beta] = state.robots;

  alpha.armour = 40;
  beta.armour = 20;
  alpha.battery = 100;
  beta.battery = 500;

  const applied = applyEliminationTiebreak(match, state);

  assert.equal(applied, true);
  assert.equal(state.result.winnerRobotId, alpha.id);
  assert.equal(state.result.winnerTeamId, "A");
});

test("applyEliminationTiebreak does not modify non-elimination matches", () => {
  const match = createMatch("live");
  const state = createDrawnState();

  const applied = applyEliminationTiebreak(match, state);

  assert.equal(applied, false);
  assert.equal(state.result.winnerRobotId, null);
  assert.equal(state.result.winnerTeamId, null);
});

function makeDb(overrides: Partial<{
  getMatch: Database["getMatch"];
  startMatchRun: Database["startMatchRun"];
  updateRunningMatchRun: Database["updateRunningMatchRun"];
}>  = {}): Database {
  return {
    getMatch: async () => null,
    startMatchRun: async () => false,
    updateRunningMatchRun: async () => true,
    ...overrides
  } as unknown as Database;
}

test("executeStoredMatch throws when match is not found", async () => {
  const db = makeDb({ getMatch: async () => null });
  await assert.rejects(
    () => executeStoredMatch(db, "missing-id"),
    /was not found/
  );
});

test("executeStoredMatch throws when match cannot be claimed", async () => {
  const match = { ...createMatch("single-elimination"), id: "match-1", status: "pending" as const };
  const db = makeDb({
    getMatch: async () => match as any,
    startMatchRun: async () => false
  });
  await assert.rejects(
    () => executeStoredMatch(db, "match-1"),
    /is not runnable/
  );
});
