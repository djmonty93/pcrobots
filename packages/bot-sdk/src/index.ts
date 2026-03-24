import type { RobotCommand, RobotTurnSnapshot } from "@pcrobots/engine";

export type BotLanguage = "javascript" | "typescript" | "python";

export interface BotRevisionRef {
  botId: string;
  revisionId: string;
  language: BotLanguage;
}

export interface RunnerLimits {
  cpuMs: number;
  memoryMb: number;
  stdoutBytes: number;
  processCount: number;
}

export interface BotInitMessage {
  type: "init";
  matchId: string;
  bot: BotRevisionRef;
  seed: number;
}

export interface BotTurnMessage {
  type: "turn";
  tick: number;
  snapshot: RobotTurnSnapshot;
}

export interface BotActionMessage {
  type: "action";
  action: RobotCommand;
}

export interface BotSourceFile {
  language: BotLanguage;
  source: string;
}

export interface LoadedBot {
  id: string;
  language: BotLanguage;
  runTurn(snapshot: RobotTurnSnapshot, timeoutMs?: number): RobotCommand;
}

export * from "./javascript.js";
export { loadPythonBot } from "./python.js";
export * from "./runtime.js";
