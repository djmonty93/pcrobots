import { type MatchEvent, type MatchResult } from "@pcrobots/engine";

export type BotStatsMode = "per-bot" | "per-variant" | "reset-on-variant";
export type BotStatsScope = "bot" | "revision";

export interface StatsParticipant {
  id: string;
  botId: string;
  botRevisionId: string;
  revisionVersion: number;
  teamId: "A" | "B" | "C";
}

export interface BotStatsCounters {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  shotsFired: number;
  shotsLanded: number;
  directHits: number;
  scans: number;
  kills: number;
  deaths: number;
  damageGiven: number;
  damageTaken: number;
  collisions: number;
}

export interface BotStatsDelta extends BotStatsCounters {
  botId: string;
  botRevisionId: string;
  revisionVersion: number;
}

export interface BotStatsWritePlan extends BotStatsCounters {
  botId: string;
  botRevisionId: string | null;
  scope: BotStatsScope;
  scopeKey: string;
}

const damagingShellOutcomes = new Set(["close_blast", "near_miss", "direct_hit"]);

export function createEmptyBotStatsCounters(): BotStatsCounters {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    shotsFired: 0,
    shotsLanded: 0,
    directHits: 0,
    scans: 0,
    kills: 0,
    deaths: 0,
    damageGiven: 0,
    damageTaken: 0,
    collisions: 0
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function summarizeCompletedMatchStats(input: {
  participants: StatsParticipant[];
  result: MatchResult | null;
  events: MatchEvent[];
}): BotStatsDelta[] {
  const statsByParticipantId = new Map<string, BotStatsDelta>();

  for (const participant of input.participants) {
    statsByParticipantId.set(participant.id, {
      botId: participant.botId,
      botRevisionId: participant.botRevisionId,
      revisionVersion: participant.revisionVersion,
      ...createEmptyBotStatsCounters()
    });
  }

  for (const event of input.events) {
    switch (event.type) {
      case "robot.fired": {
        const robotId = asString(event.payload.robotId);
        const stats = robotId ? statsByParticipantId.get(robotId) : undefined;
        if (stats) {
          stats.shotsFired += 1;
        }
        break;
      }
      case "shell.resolved": {
        const firerId = asString(event.payload.firerId);
        const outcome = asString(event.payload.outcome);
        const stats = firerId ? statsByParticipantId.get(firerId) : undefined;
        if (stats && outcome && damagingShellOutcomes.has(outcome)) {
          stats.shotsLanded += 1;
          if (outcome === "direct_hit") {
            stats.directHits += 1;
          }
        }
        break;
      }
      case "robot.scanned": {
        const robotId = asString(event.payload.robotId);
        const stats = robotId ? statsByParticipantId.get(robotId) : undefined;
        if (stats) {
          stats.scans += 1;
        }
        break;
      }
      case "robot.damaged": {
        const robotId = asString(event.payload.robotId);
        const cause = asString(event.payload.cause);
        const amount = asNumber(event.payload.amount) ?? 0;
        const targetStats = robotId ? statsByParticipantId.get(robotId) : undefined;
        if (targetStats) {
          targetStats.damageTaken += amount;
        }

        if (cause && cause !== robotId) {
          const sourceStats = statsByParticipantId.get(cause);
          if (sourceStats) {
            sourceStats.damageGiven += amount;
          }
        }
        break;
      }
      case "robot.destroyed": {
        const robotId = asString(event.payload.robotId);
        const cause = asString(event.payload.cause);
        const targetStats = robotId ? statsByParticipantId.get(robotId) : undefined;
        if (targetStats) {
          targetStats.deaths += 1;
        }

        if (cause && cause !== robotId) {
          const sourceStats = statsByParticipantId.get(cause);
          if (sourceStats) {
            sourceStats.kills += 1;
          }
        }
        break;
      }
      case "robot.collision": {
        const robotId = asString(event.payload.robotId);
        const stats = robotId ? statsByParticipantId.get(robotId) : undefined;
        if (stats) {
          stats.collisions += 1;
        }
        break;
      }
    }
  }

  const winnerIds = new Set<string>();
  if (input.result?.winnerRobotId) {
    winnerIds.add(input.result.winnerRobotId);
  } else if (input.result?.winnerTeamId) {
    for (const participant of input.participants) {
      if (participant.teamId === input.result.winnerTeamId) {
        winnerIds.add(participant.id);
      }
    }
  }

  for (const participant of input.participants) {
    const stats = statsByParticipantId.get(participant.id);
    if (!stats) {
      continue;
    }

    stats.matches += 1;
    if (winnerIds.size === 0) {
      stats.draws += 1;
    } else if (winnerIds.has(participant.id)) {
      stats.wins += 1;
    } else {
      stats.losses += 1;
    }
  }

  return [...statsByParticipantId.values()];
}

export function calculateRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
}

export function shouldResetBotStatsOnUpdate(statsMode: BotStatsMode, createdNewVariant: boolean): boolean {
  return statsMode === "reset-on-variant" && createdNewVariant;
}

export function createBotStatsWritePlans(statsMode: BotStatsMode, delta: BotStatsDelta): BotStatsWritePlan[] {
  const aggregatePlan: BotStatsWritePlan = {
    botId: delta.botId,
    botRevisionId: null,
    scope: "bot",
    scopeKey: "bot",
    matches: delta.matches,
    wins: delta.wins,
    losses: delta.losses,
    draws: delta.draws,
    shotsFired: delta.shotsFired,
    shotsLanded: delta.shotsLanded,
    directHits: delta.directHits,
    scans: delta.scans,
    kills: delta.kills,
    deaths: delta.deaths,
    damageGiven: delta.damageGiven,
    damageTaken: delta.damageTaken,
    collisions: delta.collisions
  };

  if (statsMode === "per-bot") {
    return [aggregatePlan];
  }

  return [
    aggregatePlan,
    {
      botId: delta.botId,
      botRevisionId: delta.botRevisionId,
      scope: "revision",
      scopeKey: delta.botRevisionId,
      matches: delta.matches,
      wins: delta.wins,
      losses: delta.losses,
      draws: delta.draws,
      shotsFired: delta.shotsFired,
      shotsLanded: delta.shotsLanded,
      directHits: delta.directHits,
      scans: delta.scans,
      kills: delta.kills,
      deaths: delta.deaths,
      damageGiven: delta.damageGiven,
      damageTaken: delta.damageTaken,
      collisions: delta.collisions
    }
  ];
}
