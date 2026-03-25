import { spawnSync, type SpawnSyncReturns } from "node:child_process";

import { simulateMatch, type SimulatedMatch } from "./execution.js";
import { type MatchRecord } from "./db.js";

export interface SandboxDockerConfig {
  image: string;
  cpuLimit: string;
  memoryLimit: string;
  pidsLimit: string;
  timeoutMs: number;
}

function getExecutionMode(): "local" | "container" {
  return process.env.PCROBOTS_EXECUTION_MODE === "container" ? "container" : "local";
}

function getDockerCommand(): string {
  return process.env.PCROBOTS_DOCKER_BIN?.trim() || "docker";
}

function getSandboxConfig(match: MatchRecord): SandboxDockerConfig {
  const envTimeout = process.env.PCROBOTS_SANDBOX_TIMEOUT_MS;
  const parsedTimeout = envTimeout ? Number(envTimeout) : Number.NaN;
  const computedTimeout = Math.max(5_000, match.maxTicks * 100);
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : computedTimeout;

  return {
    image: process.env.PCROBOTS_RUNNER_IMAGE?.trim() || "pcrobots-worker:latest",
    cpuLimit: process.env.PCROBOTS_SANDBOX_CPU_LIMIT?.trim() || "0.50",
    memoryLimit: process.env.PCROBOTS_SANDBOX_MEMORY_LIMIT?.trim() || "256m",
    pidsLimit: process.env.PCROBOTS_SANDBOX_PIDS_LIMIT?.trim() || "64",
    timeoutMs
  };
}

export function buildSandboxDockerArgs(config: SandboxDockerConfig): string[] {
  return [
    "run",
    "--rm",
    "-i",
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--pids-limit",
    config.pidsLimit,
    "--memory",
    config.memoryLimit,
    "--cpus",
    config.cpuLimit,
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m",
    "--user",
    "node",
    "--workdir",
    "/app",
    "--env",
    "PCROBOTS_RUNNERS_DIR=/app/runners",
    "--env",
    "PCROBOTS_PYTHON_BIN=python",
    config.image,
    "node",
    "/app/packages/platform/dist/platform/src/sandbox-runner.js"
  ];
}

function spawnSandbox(config: SandboxDockerConfig, payload: string): SpawnSyncReturns<string> {
  return spawnSync(getDockerCommand(), buildSandboxDockerArgs(config), {
    encoding: "utf8",
    input: payload,
    timeout: config.timeoutMs
  });
}

export function parseSandboxResult(result: SpawnSyncReturns<string>): SimulatedMatch {
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Sandbox exited with status ${result.status}`);
  }

  if (!result.stdout.trim()) {
    throw new Error("Sandbox produced no output");
  }

  try {
    return JSON.parse(result.stdout) as SimulatedMatch;
  } catch {
    const preview = result.stdout.slice(0, 200).trim();
    throw new Error(`Sandbox output could not be parsed as JSON: ${preview}`);
  }
}

function executeMatchInContainer(match: MatchRecord): SimulatedMatch {
  const config = getSandboxConfig(match);
  const payload = JSON.stringify(match);
  return parseSandboxResult(spawnSandbox(config, payload));
}

export function executeIsolatedMatch(match: MatchRecord): SimulatedMatch {
  if (getExecutionMode() === "container") {
    return executeMatchInContainer(match);
  }

  return simulateMatch(match);
}
