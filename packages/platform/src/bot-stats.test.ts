import test from "node:test";
import assert from "node:assert/strict";

import { summarizeCompletedMatchStats, calculateRate } from "./bot-stats.js";

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

