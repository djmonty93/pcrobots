import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTournamentSchedule,
  computeTournamentMetrics,
  type TournamentEntryRecord,
  type TournamentRoundRecord
} from "./competitions.js";
import type { MatchParticipantRecord, MatchRecord } from "./db.js";

function createEntry(seed: number, botName: string): TournamentEntryRecord {
  return {
    id: `entry-${seed}`,
    tournamentId: "tournament-1",
    botRevisionId: `rev-${seed}`,
    botId: `bot-${seed}`,
    botName,
    language: "javascript",
    revisionVersion: 1,
    seed,
    createdAt: new Date(2026, 0, seed).toISOString()
  };
}

function createParticipant(seed: number, teamId: "A" | "B"): MatchParticipantRecord {
  return {
    id: `participant-${seed}-${teamId}`,
    matchId: `match-${seed}-${teamId}`,
    botRevisionId: `rev-${seed}`,
    botId: `bot-${seed}`,
    botName: `Bot ${seed}`,
    language: "javascript",
    source: "module.exports = () => ({ kind: 'noop' });",
    revisionVersion: 1,
    teamId,
    slot: teamId === "A" ? 0 : 1
  };
}

function createMatch(input: {
  id: string;
  mode: MatchRecord["mode"];
  status?: MatchRecord["status"];
  createdAt: string;
  winnerTeamId?: "A" | "B" | null;
  participants: [MatchParticipantRecord, MatchParticipantRecord];
}): MatchRecord {
  const [left, right] = input.participants;
  const status = input.status ?? "completed";
  return {
    id: input.id,
    name: input.id,
    mode: input.mode,
    status,
    ladderId: null,
    tournamentId: null,
    tournamentRoundId: null,
    roundSlot: null,
    arenaRevisionId: "arena-rev-1",
    arenaId: "arena-1",
    arenaName: "Arena",
    arenaText: ".",
    seed: 1,
    maxTicks: 100,
    errorMessage: null,
    result:
      status === "completed"
        ? {
            finished: true,
            winnerRobotId: input.winnerTeamId === "A" ? left.id : input.winnerTeamId === "B" ? right.id : null,
            winnerTeamId: input.winnerTeamId ?? null,
            reason: "test"
          }
        : null,
    events: [],
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    participants: [left, right]
  };
}

test("buildTournamentSchedule expands double-elimination losers rounds for 8 entrants", () => {
  const entries = Array.from({ length: 8 }, (_, index) => createEntry(index + 1, `Bot ${index + 1}`));
  const rounds = buildTournamentSchedule("double-elimination", entries);

  assert.equal(rounds.filter((round) => round.bracket === "winners").length, 3);
  assert.equal(rounds.filter((round) => round.bracket === "losers").length, 4);
  assert.equal(rounds.filter((round) => round.bracket === "finals").length, 1);
});

test("computeTournamentMetrics crowns the round-robin leader when all matches are complete", () => {
  const entries = [createEntry(1, "Bot 1"), createEntry(2, "Bot 2"), createEntry(3, "Bot 3")];
  const rounds: TournamentRoundRecord[] = [
    {
      id: "round-1",
      tournamentId: "tournament-1",
      bracket: "round-robin",
      roundNumber: 1,
      label: "Round Robin 1",
      createdAt: "2026-01-01T00:00:00.000Z",
      matches: [
        createMatch({
          id: "match-1",
          mode: "round-robin",
          createdAt: "2026-01-01T00:00:00.000Z",
          winnerTeamId: "A",
          participants: [createParticipant(1, "A"), createParticipant(2, "B")]
        })
      ]
    },
    {
      id: "round-2",
      tournamentId: "tournament-1",
      bracket: "round-robin",
      roundNumber: 2,
      label: "Round Robin 2",
      createdAt: "2026-01-02T00:00:00.000Z",
      matches: [
        createMatch({
          id: "match-2",
          mode: "round-robin",
          createdAt: "2026-01-02T00:00:00.000Z",
          winnerTeamId: "A",
          participants: [createParticipant(1, "A"), createParticipant(3, "B")]
        })
      ]
    },
    {
      id: "round-3",
      tournamentId: "tournament-1",
      bracket: "round-robin",
      roundNumber: 3,
      label: "Round Robin 3",
      createdAt: "2026-01-03T00:00:00.000Z",
      matches: [
        createMatch({
          id: "match-3",
          mode: "round-robin",
          createdAt: "2026-01-03T00:00:00.000Z",
          winnerTeamId: "A",
          participants: [createParticipant(2, "A"), createParticipant(3, "B")]
        })
      ]
    }
  ];

  const metrics = computeTournamentMetrics("round-robin", entries, rounds);

  assert.equal(metrics.summary.leaderBotName, "Bot 1");
  assert.equal(metrics.summary.championBotName, "Bot 1");
  assert.equal(metrics.standings[0]?.points, 6);
});

test("computeTournamentMetrics uses the last completed finals match as the double-elimination champion", () => {
  const entries = [createEntry(1, "Bot 1"), createEntry(2, "Bot 2")];
  const finalsParticipants: [MatchParticipantRecord, MatchParticipantRecord] = [
    createParticipant(1, "A"),
    createParticipant(2, "B")
  ];

  const rounds: TournamentRoundRecord[] = [
    {
      id: "winners-1",
      tournamentId: "tournament-1",
      bracket: "winners",
      roundNumber: 1,
      label: "Winners Round 1",
      createdAt: "2026-02-01T00:00:00.000Z",
      matches: [
        createMatch({
          id: "winners-final",
          mode: "double-elimination",
          createdAt: "2026-02-01T00:00:00.000Z",
          winnerTeamId: "A",
          participants: finalsParticipants
        })
      ]
    },
    {
      id: "losers-1",
      tournamentId: "tournament-1",
      bracket: "losers",
      roundNumber: 1,
      label: "Losers Round 1",
      createdAt: "2026-02-02T00:00:00.000Z",
      matches: []
    },
    {
      id: "finals-1",
      tournamentId: "tournament-1",
      bracket: "finals",
      roundNumber: 1,
      label: "Grand Final",
      createdAt: "2026-02-03T00:00:00.000Z",
      matches: [
        createMatch({
          id: "grand-final",
          mode: "double-elimination",
          createdAt: "2026-02-03T00:00:00.000Z",
          winnerTeamId: "B",
          participants: finalsParticipants
        }),
        createMatch({
          id: "grand-final-reset",
          mode: "double-elimination",
          createdAt: "2026-02-04T00:00:00.000Z",
          winnerTeamId: "B",
          participants: finalsParticipants
        })
      ]
    }
  ];

  const metrics = computeTournamentMetrics("double-elimination", entries, rounds);

  assert.equal(metrics.summary.championBotName, "Bot 2");
  assert.equal(metrics.summary.leaderBotName, "Bot 2");
});
