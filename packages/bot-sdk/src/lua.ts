import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import path from "node:path";

import type { RobotTurnSnapshot } from "@pcrobots/engine";

import type { BotSourceFile, LoadedBot } from "./index.js";
import { normalizeAction } from "./runtime.js";

function getLuaRunnerPath(): string {
  const runnersDir = process.env.PCROBOTS_RUNNERS_DIR?.trim();
  return runnersDir
    ? path.resolve(runnersDir, "lua", "runner.lua")
    : path.resolve(process.cwd(), "runners", "lua", "runner.lua");
}

function getLuaCommands(): string[] {
  const configured = process.env.PCROBOTS_LUA_BIN?.trim();
  return [...new Set([configured, "lua5.4", "lua54", "lua"].filter((value): value is string => Boolean(value)))];
}

function spawnLuaRunner(
  runnerPath: string,
  payload: string,
  timeoutMs: number
): SpawnSyncReturns<string> {
  let lastResult: SpawnSyncReturns<string> | null = null;

  for (const command of getLuaCommands()) {
    const result = spawnSync(command, [runnerPath], {
      input: payload,
      encoding: "utf8",
      timeout: timeoutMs
    });

    lastResult = result;
    if (!(result.error && "code" in result.error && result.error.code === "ENOENT")) {
      return result;
    }
  }

  if (lastResult) {
    return lastResult;
  }

  throw new Error("No Lua command candidates were configured");
}

export function loadLuaBot(id: string, file: BotSourceFile): LoadedBot {
  if (file.language !== "lua") {
    throw new Error(`Unsupported language for Lua loader: ${file.language}`);
  }

  const runnerPath = getLuaRunnerPath();

  return {
    id,
    language: "lua",
    runTurn(snapshot: RobotTurnSnapshot, timeoutMs = 100) {
      const payload = JSON.stringify({
        source: file.source,
        snapshot
      });

      const result = spawnLuaRunner(runnerPath, payload, timeoutMs);
      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0) {
        throw new Error(result.stderr || `Lua runner exited with status ${result.status}`);
      }

      return normalizeAction(JSON.parse(result.stdout));
    }
  };
}
