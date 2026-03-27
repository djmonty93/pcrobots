import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { RobotTurnSnapshot } from "@pcrobots/engine";

import type { LoadedBot, NativeBotFile } from "./index.js";
import { normalizeAction } from "./runtime.js";

function createExecutableFromArtifact(id: string, artifactBase64: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), `pcrobots-native-${id}-`));
  const executablePath = path.join(directory, "bot.bin");
  const artifact = Buffer.from(artifactBase64, "base64");
  writeFileSync(executablePath, artifact, { mode: 0o755 });
  chmodSync(executablePath, 0o755);
  return executablePath;
}

export function loadNativeLinuxBot(id: string, file: NativeBotFile): LoadedBot {
  if (file.language !== "linux-x64-binary") {
    throw new Error(`Unsupported language for native Linux loader: ${file.language}`);
  }
  if (process.platform !== "linux") {
    throw new Error("linux-x64-binary bots can only run inside the Linux sandbox runtime");
  }

  const executablePath = createExecutableFromArtifact(id, file.artifactBase64);
  const cleanup = () => rmSync(path.dirname(executablePath), { recursive: true, force: true });
  process.once("exit", cleanup);

  return {
    id,
    language: "linux-x64-binary",
    runTurn(snapshot: RobotTurnSnapshot, timeoutMs = 100) {
      const result = spawnSync(executablePath, [], {
        input: JSON.stringify(snapshot),
        encoding: "utf8",
        timeout: timeoutMs,
        cwd: path.dirname(executablePath)
      });

      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0) {
        throw new Error(result.stderr || `Native bot exited with status ${result.status}`);
      }

      return normalizeAction(JSON.parse(result.stdout));
    }
  };
}
