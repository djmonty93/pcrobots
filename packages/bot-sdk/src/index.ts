import type { RobotCommand, RobotTurnSnapshot } from "@pcrobots/engine";

export type BotLanguage = "javascript" | "typescript" | "python" | "lua";
export type NativeBotLanguage = "linux-x64-binary";
export type AnyBotLanguage = BotLanguage | NativeBotLanguage;

export interface BotRevisionRef {
  botId: string;
  revisionId: string;
  language: AnyBotLanguage;
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

export interface NativeBotFile {
  language: NativeBotLanguage;
  artifactBase64: string;
}

export interface LoadedBot {
  id: string;
  language: AnyBotLanguage;
  runTurn(snapshot: RobotTurnSnapshot, timeoutMs?: number): RobotCommand;
}

export * from "./javascript.js";
export { loadLuaBot } from "./lua.js";
export { loadNativeLinuxBot } from "./native.js";
export { loadPythonBot } from "./python.js";
export * from "./runtime.js";
