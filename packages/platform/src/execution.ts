import {
  createMatchState,
  createRobotTurnSnapshot,
  parseArenaText,
  stepMatch,
  type CommandMap,
  type MatchEvent,
  type MatchResult,
  type MatchState
} from "@pcrobots/engine";
import { loadJavaScriptBot, loadLuaBot, loadNativeLinuxBot, loadPythonBot, type LoadedBot } from "@pcrobots/bot-sdk";

import { type MatchParticipantRecord, type MatchRecord } from "./db.js";

export interface SimulatedMatch {
  result: MatchResult;
  events: MatchEvent[];
}

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
    case "lua":
      return loadLuaBot(participant.id, {
        language: participant.language,
        source: participant.source
      });
    case "linux-x64-binary":
      if (!participant.artifactBase64) {
        throw new Error(`Native Linux bot ${participant.id} is missing its artifact payload`);
      }
      return loadNativeLinuxBot(participant.id, {
        language: participant.language,
        artifactBase64: participant.artifactBase64
      });
    default:
      throw new Error(`Unsupported bot language ${(participant as { language: string }).language}`);
  }
}

function getTurnTimeoutMs(participant: MatchParticipantRecord): number {
  const configured =
    participant.language === "python"
      ? process.env.PCROBOTS_PYTHON_TURN_TIMEOUT_MS
      : participant.language === "lua"
        ? process.env.PCROBOTS_LUA_TURN_TIMEOUT_MS
        : participant.language === "linux-x64-binary"
          ? process.env.PCROBOTS_NATIVE_TURN_TIMEOUT_MS
        : process.env.PCROBOTS_SCRIPT_TURN_TIMEOUT_MS;
  const parsed = configured ? Number(configured) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  if (participant.language === "python") {
    return 500;
  }

  if (participant.language === "lua") {
    return 250;
  }

  if (participant.language === "linux-x64-binary") {
    return 100;
  }

  return 100;
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

export function simulateMatch(match: MatchRecord): SimulatedMatch {
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

      commands[participant.id] = bot.runTurn(createRobotTurnSnapshot(state, participant.id), getTurnTimeoutMs(participant));
    }

    stepMatch(state, { commands, timeLimit: match.maxTicks });
  }

  applyEliminationTiebreak(match, state);

  return {
    result: state.result,
    events: state.events
  };
}

