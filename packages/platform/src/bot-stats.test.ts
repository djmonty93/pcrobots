import test from "node:test";
import assert from "node:assert/strict";

import type { PoolClient } from "pg";

import {
  summarizeCompletedMatchStats,
  calculateRate,
  createBotStatsWritePlans,
  shouldResetBotStatsOnUpdate
} from "./bot-stats.js";
import { Database } from "./db.js";

test("summarizeCompletedMatchStats counts wins, shots, hits, damage, kills, and deaths", () => {
  const [alpha, beta] = summarizeCompletedMatchStats({
    participants: [
      { id: "p1", botId: "bot-1", botRevisionId: "rev-1", revisionVersion: 1, teamId: "A" },
      { id: "p2", botId: "bot-2", botRevisionId: "rev-2", revisionVersion: 3, teamId: "B" }
    ],
    result: {
      finished: true,
      winnerRobotId: "p1",
      winnerTeamId: "A",
      reason: "last_robot"
    },
    events: [
      { tick: 1, type: "robot.fired", payload: { robotId: "p1", shellId: 1, heading: 0, range: 40 } },
      { tick: 2, type: "shell.resolved", payload: { shellId: 1, firerId: "p1", outcome: "direct_hit" } },
      { tick: 2, type: "robot.damaged", payload: { robotId: "p2", amount: 25, cause: "p1", armour: 0 } },
      { tick: 2, type: "robot.destroyed", payload: { robotId: "p2", cause: "p1" } },
      { tick: 2, type: "robot.scanned", payload: { robotId: "p1", detectedRobotId: "p2", range: 30, heading: 0, resolution: 10 } },
      { tick: 2, type: "robot.collision", payload: { robotId: "p2", cause: "bounds" } }
    ]
  });

  assert.deepEqual(alpha, {
    botId: "bot-1",
    botRevisionId: "rev-1",
    revisionVersion: 1,
    matches: 1,
    wins: 1,
    losses: 0,
    draws: 0,
    shotsFired: 1,
    shotsLanded: 1,
    directHits: 1,
    scans: 1,
    kills: 1,
    deaths: 0,
    damageGiven: 25,
    damageTaken: 0,
    collisions: 0
  });

  assert.deepEqual(beta, {
    botId: "bot-2",
    botRevisionId: "rev-2",
    revisionVersion: 3,
    matches: 1,
    wins: 0,
    losses: 1,
    draws: 0,
    shotsFired: 0,
    shotsLanded: 0,
    directHits: 0,
    scans: 0,
    kills: 0,
    deaths: 1,
    damageGiven: 0,
    damageTaken: 25,
    collisions: 1
  });
});

test("summarizeCompletedMatchStats records draws and ignores self-inflicted credit", () => {
  const [alpha] = summarizeCompletedMatchStats({
    participants: [{ id: "p1", botId: "bot-1", botRevisionId: "rev-1", revisionVersion: 2, teamId: "A" }],
    result: {
      finished: true,
      winnerRobotId: null,
      winnerTeamId: null,
      reason: "time_limit"
    },
    events: [
      { tick: 1, type: "robot.fired", payload: { robotId: "p1", shellId: 1, heading: 0, range: 30 } },
      { tick: 2, type: "shell.resolved", payload: { shellId: 1, firerId: "p1", outcome: "close_blast" } },
      { tick: 2, type: "robot.damaged", payload: { robotId: "p1", amount: 2, cause: "p1", armour: 98 } }
    ]
  });

  assert.equal(alpha.draws, 1);
  assert.equal(alpha.wins, 0);
  assert.equal(alpha.losses, 0);
  assert.equal(alpha.shotsLanded, 1);
  assert.equal(alpha.damageGiven, 0);
  assert.equal(alpha.damageTaken, 2);
});

test("calculateRate rounds to one decimal place", () => {
  assert.equal(calculateRate(0, 0), 0);
  assert.equal(calculateRate(1, 3), 33.3);
  assert.equal(calculateRate(2, 3), 66.7);
});

test("createBotStatsWritePlans always writes a bot aggregate and adds revision buckets only when needed", () => {
  const delta = {
    botId: "bot-1",
    botRevisionId: "rev-2",
    revisionVersion: 2,
    matches: 1,
    wins: 1,
    losses: 0,
    draws: 0,
    shotsFired: 2,
    shotsLanded: 1,
    directHits: 1,
    scans: 3,
    kills: 1,
    deaths: 0,
    damageGiven: 10,
    damageTaken: 4,
    collisions: 0
  };

  assert.deepEqual(createBotStatsWritePlans("per-bot", delta), [
    {
      botId: "bot-1",
      botRevisionId: null,
      scope: "bot",
      scopeKey: "bot",
      matches: 1,
      wins: 1,
      losses: 0,
      draws: 0,
      shotsFired: 2,
      shotsLanded: 1,
      directHits: 1,
      scans: 3,
      kills: 1,
      deaths: 0,
      damageGiven: 10,
      damageTaken: 4,
      collisions: 0
    }
  ]);

  assert.deepEqual(createBotStatsWritePlans("per-variant", delta).map((entry) => entry.scopeKey), ["bot", "rev-2"]);
  assert.deepEqual(createBotStatsWritePlans("reset-on-variant", delta).map((entry) => entry.scopeKey), ["bot", "rev-2"]);
});

test("shouldResetBotStatsOnUpdate only resets for reset-on-variant when a new revision is created", () => {
  assert.equal(shouldResetBotStatsOnUpdate("per-bot", true), false);
  assert.equal(shouldResetBotStatsOnUpdate("per-variant", true), false);
  assert.equal(shouldResetBotStatsOnUpdate("reset-on-variant", false), false);
  assert.equal(shouldResetBotStatsOnUpdate("reset-on-variant", true), true);
});

test("updateBotStatsForCompletedMatch honors the snapshotted participant stats mode", async () => {
  const db = Object.create(Database.prototype) as Record<string, unknown>;
  const insertCalls: unknown[][] = [];

  const fakeClient = {
    async query<T>(sql: string, params: unknown[]) {
      if (sql.includes("FROM match_participants AS mp")) {
        return {
          rows: [
            {
              participant_id: "participant-1",
              bot_id: "bot-1",
              bot_revision_id: "rev-1",
              revision_version: 1,
              team_id: "A",
              stats_mode: "per-variant"
            }
          ] as T[],
          rowCount: 1
        };
      }

      if (sql.includes("INSERT INTO bot_stats")) {
        insertCalls.push(params);
        return { rows: [] as T[], rowCount: 1 };
      }

      throw new Error(`Unexpected query in test: ${sql}`);
    }
  } as unknown as PoolClient;

  await (db.updateBotStatsForCompletedMatch as (
    client: PoolClient,
    matchId: string,
    result: unknown,
    events: unknown
  ) => Promise<void>)(
    fakeClient,
    "match-1",
    { finished: true, winnerRobotId: "participant-1", winnerTeamId: "A", reason: "last_robot" },
    []
  );

  assert.equal(insertCalls.length, 2);
  assert.deepEqual(insertCalls.map((params) => params[4]), ["bot", "rev-1"]);
});
