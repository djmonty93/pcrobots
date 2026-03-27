import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { type MatchParticipantRecord, type MatchRecord } from "./db.js";
import { simulateMatch, applyEliminationTiebreak } from "./execution.js";
import { createMatchState, parseArenaText } from "@pcrobots/engine";

function makeParticipant(id: string, language: string, teamId: "A" | "B", slot: number): MatchParticipantRecord {
  return {
    id,
    matchId: "match-1",
    botRevisionId: `rev-${id}`,
    botId: `bot-${id}`,
    botName: `Bot ${id}`,
    language: language as MatchParticipantRecord["language"],
    source: "module.exports = () => ({ kind: 'noop' });",
    artifactBase64: null,
    artifactFileName: null,
    artifactSha256: null,
    artifactSizeBytes: null,
    revisionVersion: 1,
    teamId,
    slot
  };
}

function hasLuaRuntime(): boolean {
  const candidates = [...new Set([process.env.PCROBOTS_LUA_BIN, "lua5.4", "lua54", "lua"].filter(Boolean))];

  for (const candidate of candidates) {
    const result = spawnSync(candidate!, ["-v"], { encoding: "utf8", timeout: 2000 });
    if (!(result.error && "code" in result.error && result.error.code === "ENOENT")) {
      return !result.error;
    }
  }

  return false;
}

function makeMatch(participants: MatchParticipantRecord[]): MatchRecord {
  return {
    id: "match-1",
    name: "Test Match",
    mode: "single-elimination",
    status: "pending",
    ladderId: null,
    tournamentId: null,
    tournamentRoundId: null,
    roundSlot: null,
    arenaRevisionId: "arena-rev-1",
    arenaId: "arena-1",
    arenaName: "Arena",
    arenaText: "A.................................................................................................B",
    seed: 1,
    maxTicks: 1,
    errorMessage: null,
    result: { finished: false, winnerRobotId: null, winnerTeamId: null, reason: "time_limit" },
    events: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    participants
  };
}

test("simulateMatch throws for unsupported language", () => {
  const participants = [
    makeParticipant("p1", "rust", "A", 0),
    makeParticipant("p2", "javascript", "B", 1)
  ];
  assert.throws(
    () => simulateMatch(makeMatch(participants)),
    /Unsupported bot language rust/
  );
});

test("simulateMatch accepts Lua bots when a Lua runtime is available", { skip: !hasLuaRuntime() }, () => {
  const participants = [
    {
      ...makeParticipant("p1", "lua", "A", 0),
      source: `return function(snapshot)
  return { kind = "noop" }
end`
    },
    makeParticipant("p2", "javascript", "B", 1)
  ];

  const simulated = simulateMatch(makeMatch(participants));

  assert.equal(Array.isArray(simulated.events), true);
  assert.equal(typeof simulated.result.finished, "boolean");
});

test("simulateMatch throws if a linux-x64-binary participant has no artifact payload", () => {
  const participants = [
    {
      ...makeParticipant("p1", "linux-x64-binary", "A", 0),
      source: "",
      artifactBase64: null
    },
    makeParticipant("p2", "javascript", "B", 1)
  ];

  assert.throws(
    () => simulateMatch(makeMatch(participants)),
    /missing its artifact payload/
  );
});

test("applyEliminationTiebreak uses battery as secondary tiebreak when armour is equal", () => {
  const match = makeMatch([
    makeParticipant("p1", "javascript", "A", 0),
    makeParticipant("p2", "javascript", "B", 1)
  ]);
  const arena = parseArenaText("A.................................................................................................B");
  const state = createMatchState({
    seed: 1,
    arena,
    entrants: [
      { id: "p1", name: "Bot p1", teamId: "A" },
      { id: "p2", name: "Bot p2", teamId: "B" }
    ]
  });
  state.result.finished = true;
  state.result.reason = "time_limit";

  const [alpha, beta] = state.robots;
  alpha.armour = 50;
  beta.armour = 50;
  alpha.battery = 200;
  beta.battery = 100;

  applyEliminationTiebreak(match, state);

  assert.equal(state.result.winnerRobotId, alpha.id, "higher battery wins when armour is tied");
});

test("applyEliminationTiebreak returns false when all robots are dead", () => {
  const match = makeMatch([
    makeParticipant("p1", "javascript", "A", 0),
    makeParticipant("p2", "javascript", "B", 1)
  ]);
  const arena = parseArenaText("A.................................................................................................B");
  const state = createMatchState({
    seed: 1,
    arena,
    entrants: [
      { id: "p1", name: "Bot p1", teamId: "A" },
      { id: "p2", name: "Bot p2", teamId: "B" }
    ]
  });
  state.result.finished = true;
  state.result.reason = "time_limit";
  state.robots.forEach((r) => { r.alive = false; });

  const applied = applyEliminationTiebreak(match, state);
  assert.equal(applied, false);
  assert.equal(state.result.winnerRobotId, null);
});
