import {
  createMatchState,
  createRobotTurnSnapshot,
  parseArenaText,
  stepMatch,
  type CommandMap,
  type MatchState
} from "@pcrobots/engine";
import { loadJavaScriptBot, loadPythonBot, type LoadedBot } from "@pcrobots/bot-sdk";

import { processTournamentMatchCompletion } from "./competitions.js";
import { type Database, type MatchParticipantRecord, type MatchRecord } from "./db.js";

function loadParticipantBot(participant: MatchParticipantRecord): LoadedBot {
  switch (participant.language) {
    case "javascript":
    case "typescript":
      return loadJavaScriptBot(participant.id, {
        language: participant.language,
        source: participant.source
      });
    case "python":
      return loadPythonBot(participant.id, {
        language: participant.language,
        source: participant.source
      });
    default:
      throw new Error(`Unsupported bot language ${(participant as { language: string }).language}`);
  }
}

function isEliminationMode(match: MatchRecord): boolean {
  return match.mode === "single-elimination" || match.mode === "double-elimination";
}

export function applyEliminationTiebreak(match: MatchRecord, state: MatchState): boolean {
  if (!isEliminationMode(match) || state.result.winnerRobotId || state.result.winnerTeamId) {
    return false;
  }

  const slotByParticipant = new Map(match.participants.map((participant) => [participant.id, participant.slot]));
  const rankedRobots = state.robots
    .filter((robot) => robot.alive)
    .sort((left, right) => {
      return (
        right.armour - left.armour ||
        right.battery - left.battery ||
        right.shellsLeft - left.shellsLeft ||
        (slotByParticipant.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (slotByParticipant.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
        left.id.localeCompare(right.id)
      );
    });

  const winner = rankedRobots[0];
  if (!winner) {
    return false;
  }

  state.result.winnerRobotId = winner.id;
  state.result.winnerTeamId = winner.teamId ?? match.participants.find((participant) => participant.id === winner.id)?.teamId ?? null;
  return true;
}

export async function executeStoredMatch(database: Database, matchId: string): Promise<MatchRecord> {
  const match = await database.getMatch(matchId);
  if (!match) {
    throw new Error(`Match ${matchId} was not found`);
  }

  const claimed = await database.startMatchRun(matchId);
  if (!claimed) {
    const current = await database.getMatch(matchId);
    throw new Error(`Match ${matchId} is not runnable from status ${current?.status ?? "missing"}`);
  }

  try {
    const arena = parseArenaText(match.arenaText);
    const state = createMatchState({
      seed: match.seed,
      arena,
      entrants: match.participants.map((participant) => ({
        id: participant.id,
        name: participant.botName,
        teamId: participant.teamId
      }))
    });

    const loadedBots = new Map<string, LoadedBot>();
    for (const participant of match.participants) {
      loadedBots.set(participant.id, loadParticipantBot(participant));
    }

    for (let tick = 0; tick < match.maxTicks && !state.result.finished; tick += 1) {
      const commands: CommandMap = {};

      for (const participant of match.participants) {
        const robotState = state.robots.find((robot) => robot.id === participant.id);
        if (!robotState || !robotState.alive) {
          continue;
        }

        const bot = loadedBots.get(participant.id);
        if (!bot) {
          throw new Error(`Bot loader missing for participant ${participant.id}`);
        }

        commands[participant.id] = bot.runTurn(createRobotTurnSnapshot(state, participant.id), 50);
      }

      stepMatch(state, { commands, timeLimit: match.maxTicks });
    }

    applyEliminationTiebreak(match, state);

    const completed = await database.updateRunningMatchRun(matchId, "completed", {
      result: state.result,
      events: state.events,
      errorMessage: null
    });
    if (!completed) {
      throw new Error(`Match ${matchId} could not be marked completed from its current status`);
    }

    try {
      await processTournamentMatchCompletion(database, matchId);
    } catch (error) {
      console.error("tournament progression failed", {
        matchId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = await database.updateRunningMatchRun(matchId, "failed", {
      result: null,
      events: null,
      errorMessage: message
    });

    if (!failed) {
      console.error("match failure could not be persisted", { matchId, error: message });
    }

    throw error;
  }

  const updated = await database.getMatch(matchId);
  if (!updated) {
    throw new Error(`Match ${matchId} disappeared after execution`);
  }

  return updated;
}
