import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import path from "node:path";
import type { RobotTurnSnapshot } from "@pcrobots/engine";
import type { BotSourceFile, LoadedBot } from "./index.js";
import { normalizeAction } from "./runtime.js";

function getPythonRunnerPath(): string {
  const runnersDir = process.env.PCROBOTS_RUNNERS_DIR?.trim();
  return runnersDir
    ? path.resolve(runnersDir, "python", "runner.py")
    : path.resolve(process.cwd(), "runners", "python", "runner.py");
}

function getPythonCommands(): string[] {
  const configured = process.env.PCROBOTS_PYTHON_BIN?.trim();
  return [...new Set([configured, "python", "python3"].filter((value): value is string => Boolean(value)))];
}

function spawnPythonRunner(
  runnerPath: string,
  payload: string,
  timeoutMs: number
): SpawnSyncReturns<string> {
  let lastResult: SpawnSyncReturns<string> | null = null;

  for (const command of getPythonCommands()) {
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

  throw new Error("No Python command candidates were configured");
}

export function loadPythonBot(id: string, file: BotSourceFile): LoadedBot {
  if (file.language !== "python") {
    throw new Error(`Unsupported language for Python loader: ${file.language}`);
  }

  const runnerPath = getPythonRunnerPath();

  return {
    id,
    language: "python",
    runTurn(snapshot: RobotTurnSnapshot, timeoutMs = 50) {
      const payload = JSON.stringify({
        source: file.source,
        snapshot
      });

      const result = spawnPythonRunner(runnerPath, payload, timeoutMs);
      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0) {
        throw new Error(result.stderr || `Python runner exited with status ${result.status}`);
      }

      return normalizeAction(JSON.parse(result.stdout));
    }
  };
}
