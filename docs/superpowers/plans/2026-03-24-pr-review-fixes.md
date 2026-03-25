# PR Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all critical and important issues found during PR review of `codex/stabilize-runtime-and-tournament-flows`, plus add must-have test coverage.

**Architecture:** Direct fixes to existing files — no new modules needed. Each task is self-contained: fix a bug or add tests, then commit. All changes stay on the current feature branch.

**Tech Stack:** TypeScript, Node.js `node:test`, BullMQ, `node:http`, `node:child_process`.

---

## File Map

| File | Change |
|------|--------|
| `packages/platform/src/sandbox.ts` | Fix NaN timeout, fix JSON.parse, export `parseSandboxResult` |
| `packages/platform/src/sandbox.test.ts` | Add `parseSandboxResult` error path tests |
| `apps/api/src/server.ts` | Fix `readJsonBody` stream error, add HTTP server error handler, add port validation, add `maxTicks` bounds, add error logging in `queueStoredMatch` |
| `apps/worker/src/index.ts` | Add error logging in `queueMatches`, add BullMQ `error`/`stalled` handlers, log shutdown errors |
| `packages/platform/src/runner.test.ts` | Add `executeStoredMatch` error path tests |
| `packages/platform/src/execution.test.ts` | New — test unsupported language throws, battery-as-secondary-tiebreak |

---

## Task 1: Fix sandbox timeout NaN and maxTicks overflow

**Files:**
- Modify: `packages/platform/src/sandbox.ts:22-30`
- Modify: `apps/api/src/server.ts:246-253` (add bounds to `expectInteger` usage for maxTicks)

The current code `Number(process.env.PCROBOTS_SANDBOX_TIMEOUT_MS ?? Math.max(...))` passes NaN to `spawnSync` when the env var is set to a non-numeric string. Also `match.maxTicks * 100` can overflow with no upper bound enforced on `maxTicks` in the API.

- [ ] **Step 1: Fix `getSandboxConfig` to validate the env timeout**

In `packages/platform/src/sandbox.ts`, replace lines 22–30:

```typescript
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
```

- [ ] **Step 2: Add maxTicks bounds check in `server.ts`**

`maxTicks` is parsed from request bodies at **three locations**: lines 343, 380, and 401. Add a dedicated helper just before these call sites (near the other `expect*` helpers around line 246) to centralise the bounds check:

```typescript
function expectMaxTicks(value: unknown, fallback?: number): number {
  const ticks = expectInteger(value, "maxTicks", fallback);
  if (ticks < 1 || ticks > 10_000) {
    badRequest("maxTicks must be between 1 and 10000");
  }
  return ticks;
}
```

Then replace each of the three `expectInteger(body.maxTicks, "maxTicks", 200)` calls with `expectMaxTicks(body.maxTicks, 200)`.

Verify all three were updated:

```bash
grep -n "maxTicks" apps/api/src/server.ts
```

Expected: no remaining `expectInteger(body.maxTicks` calls (line 697 uses `ladder.maxTicks` — leave that one alone).

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd H:/Code/pcrobots && npm run check 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/platform/src/sandbox.ts apps/api/src/server.ts
git commit -m "fix: validate sandbox timeout env var and bound maxTicks input"
```

---

## Task 2: Fix sandbox JSON.parse and export parseSandboxResult for testing

**Files:**
- Modify: `packages/platform/src/sandbox.ts:74-88`
- Modify: `packages/platform/src/sandbox.test.ts`

`parseSandboxResult` calls `JSON.parse` without a try-catch. A malformed sandbox output causes a cryptic `SyntaxError`. Export the function so it can be unit-tested.

- [ ] **Step 1: Write the failing test first**

Add to `packages/platform/src/sandbox.test.ts`:

```typescript
import { buildSandboxDockerArgs, parseSandboxResult } from "./sandbox.js";

// ... existing test stays ...

test("parseSandboxResult throws if stdout is not valid JSON", () => {
  assert.throws(
    () => parseSandboxResult({ error: null, status: 0, stdout: "not-json\n", stderr: "" } as any),
    (err: Error) => {
      assert.ok(err.message.includes("not-json"));
      return true;
    }
  );
});

test("parseSandboxResult throws on non-zero exit with stderr message", () => {
  assert.throws(
    () => parseSandboxResult({ error: null, status: 1, stdout: "", stderr: "OOM killed" } as any),
    /OOM killed/
  );
});

test("parseSandboxResult throws when stdout is empty", () => {
  assert.throws(
    () => parseSandboxResult({ error: null, status: 0, stdout: "   ", stderr: "" } as any),
    /no output/i
  );
});

test("parseSandboxResult throws the spawn error when result.error is set", () => {
  const spawnError = new Error("spawn docker ENOENT");
  assert.throws(
    () => parseSandboxResult({ error: spawnError, status: null, stdout: "", stderr: "" } as any),
    /spawn docker ENOENT/
  );
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd H:/Code/pcrobots && npm test 2>&1 | grep -A 3 "parseSandboxResult"
```

Expected: 4 failures (function not exported / JSON.parse not wrapped).

- [ ] **Step 3: Export `parseSandboxResult` and wrap JSON.parse**

In `packages/platform/src/sandbox.ts`, change line 74 to export the function, and wrap the JSON.parse at line 87:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd H:/Code/pcrobots && npm test 2>&1 | grep -A 3 "parseSandboxResult"
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/platform/src/sandbox.ts packages/platform/src/sandbox.test.ts
git commit -m "fix: wrap sandbox JSON.parse and add error path tests"
```

---

## Task 3: Fix server.ts — stream error handling, HTTP error handler, port validation, queueStoredMatch logging

**Files:**
- Modify: `apps/api/src/server.ts`

Four independent issues in the same file, batched into one commit.

- [ ] **Step 1: Fix `readJsonBody` — wrap `for await` in try/catch (line ~218)**

Replace the `for await` block:

```typescript
async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  try {
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new HttpError(400, `Failed to read request body: ${message}`);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw.length === 0) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    badRequest("request body must be valid JSON", error instanceof Error ? error.message : String(error));
  }
}
```

- [ ] **Step 2: Add HTTP server error handler (after `server.listen`)**

After the `server.listen(port, ...)` call (line ~816), add:

```typescript
server.on("error", (error) => {
  console.error("http server error", {
    code: (error as NodeJS.ErrnoException).code,
    message: error.message
  });
  process.exit(1);
});
```

- [ ] **Step 3: Add port validation (before `server.listen`)**

Replace line ~815 `const port = Number(process.env.PORT ?? 3001);` with:

```typescript
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("invalid PORT value", { PORT: process.env.PORT });
  process.exit(1);
}
```

- [ ] **Step 4: Add error logging in `queueStoredMatch` (line ~461)**

```typescript
async function queueStoredMatch(match: MatchRecord): Promise<{ matchId: string; jobId: string }> {
  try {
    const queued = await queueMatchRun(db, matchQueue, match);
    return {
      matchId: queued.matchId,
      jobId: queued.jobId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("cannot be queued from status")) {
      conflict(message);
    }
    console.error("failed to queue match", { matchId: match.id, error: message });
    throw error;
  }
}
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd H:/Code/pcrobots && npm run check 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/server.ts
git commit -m "fix: add stream error handling, HTTP server error handler, port validation, and queue error logging"
```

---

## Task 4: Fix worker — queueMatches error logging, BullMQ event handlers, shutdown logging

**Files:**
- Modify: `apps/worker/src/index.ts`

- [ ] **Step 1: Add error logging in `queueMatches` and rethrow with context**

Replace the `queueMatches` function body:

```typescript
async function queueMatches(matchIds: string[]): Promise<string[]> {
  const queuedMatchIds: string[] = [];

  for (const matchId of matchIds) {
    const match = await db.getMatch(matchId);
    if (!match) {
      continue;
    }

    try {
      const queued = await queueMatchRun(db, matchQueue, match);
      if (queued.queued) {
        queuedMatchIds.push(queued.matchId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("failed to queue follow-up match", { matchId, error: message });
      throw error;
    }
  }

  return queuedMatchIds;
}
```

- [ ] **Step 2: Add BullMQ `error` and `stalled` event handlers**

After the existing `worker.on("failed", ...)` handler, add:

```typescript
worker.on("error", (error) => {
  console.error("worker error", { error: error.message });
});

worker.on("stalled", (jobId) => {
  console.warn("worker job stalled", { jobId });
});
```

- [ ] **Step 3: Log shutdown errors**

Replace the signal handler:

```typescript
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    const results = await Promise.allSettled([worker.close(), matchQueue.close(), db.close()]);
    const services = ["worker", "matchQueue", "db"];
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error("failed to close service during shutdown", {
          service: services[index],
          error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        });
      }
    }
    process.exit(0);
  });
}
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd H:/Code/pcrobots && npm run check 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/index.ts
git commit -m "fix: log queueMatches errors, add BullMQ error/stalled handlers, log shutdown failures"
```

---

## Task 5: Add executeStoredMatch error path tests

**Files:**
- Modify: `packages/platform/src/runner.test.ts`

`executeStoredMatch` has several error branches (match not found, claim failure, completion failure) that are untested. These require a mock `Database` object.

- [ ] **Step 1: Write the failing tests**

Add to `packages/platform/src/runner.test.ts` (below existing tests):

```typescript
import { executeStoredMatch } from "./runner.js";
import { type Database } from "./db.js";

function makeDb(overrides: Partial<Database> = {}): Database {
  return {
    getMatch: async () => null,
    startMatchRun: async () => false,
    completeRunningMatchRun: async () => false,
    updateRunningMatchRun: async () => true,
    ...overrides
  } as unknown as Database;
}

test("executeStoredMatch throws when match is not found", async () => {
  const db = makeDb({ getMatch: async () => null });
  await assert.rejects(
    () => executeStoredMatch(db, "missing-id"),
    /was not found/
  );
});

test("executeStoredMatch throws when match cannot be claimed", async () => {
  const match = { ...createMatch("single-elimination"), id: "match-1", status: "pending" };
  const db = makeDb({
    getMatch: async () => match as any,
    startMatchRun: async () => false
  });
  await assert.rejects(
    () => executeStoredMatch(db, "match-1"),
    /is not runnable/
  );
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd H:/Code/pcrobots && npm test 2>&1 | grep -A 3 "executeStoredMatch throws"
```

Expected: failures (import missing or type errors to work through).

- [ ] **Step 3: Add the `executeStoredMatch` import to the test file**

Check the existing imports at the top of `runner.test.ts` and add `executeStoredMatch` if not already there:

```typescript
import { applyEliminationTiebreak, executeStoredMatch } from "./runner.js";
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd H:/Code/pcrobots && npm test 2>&1 | grep -A 3 "executeStoredMatch throws"
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/platform/src/runner.test.ts
git commit -m "test: add executeStoredMatch error path coverage"
```

---

## Task 6: Add execution.ts tests — unsupported language and battery tiebreak

**Files:**
- Create: `packages/platform/src/execution.test.ts`

`simulateMatch` throws for unsupported languages but is untested. The existing tiebreak test also doesn't verify battery as secondary criterion.

- [ ] **Step 1: Write the tests**

Create `packages/platform/src/execution.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";

import { type MatchParticipantRecord, type MatchRecord } from "./db.js";
import { simulateMatch, applyEliminationTiebreak } from "./execution.js";
import { createMatchState, parseArenaText } from "@pcrobots/engine";

function makeParticipant(id: string, language: string, teamId: "A" | "B", slot: number): MatchParticipantRecord {
  return {
    id,
    matchId: "match-1",
    botRevisionId: `rev-${id}`,
    botId: `bot-${id}`,
    botName: `Bot ${id}`,
    language: language as MatchParticipantRecord["language"],
    source: "module.exports = () => ({ kind: 'noop' });",
    revisionVersion: 1,
    teamId,
    slot
  };
}

function makeMatch(participants: MatchParticipantRecord[]): MatchRecord {
  return {
    id: "match-1",
    name: "Test Match",
    mode: "single-elimination",
    status: "pending",
    ladderId: null,
    tournamentId: null,
    tournamentRoundId: null,
    roundSlot: null,
    arenaRevisionId: "arena-rev-1",
    arenaId: "arena-1",
    arenaName: "Arena",
    arenaText: "A.................................................................................................B",
    seed: 1,
    maxTicks: 1,
    errorMessage: null,
    result: { finished: false, winnerRobotId: null, winnerTeamId: null, reason: "time_limit" },
    events: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    participants
  };
}

test("simulateMatch throws for unsupported language", () => {
  const participants = [
    makeParticipant("p1", "rust", "A", 0),
    makeParticipant("p2", "javascript", "B", 1)
  ];
  assert.throws(
    () => simulateMatch(makeMatch(participants)),
    /Unsupported bot language rust/
  );
});

test("applyEliminationTiebreak uses battery as secondary tiebreak when armour is equal", () => {
  const match = makeMatch([
    makeParticipant("p1", "javascript", "A", 0),
    makeParticipant("p2", "javascript", "B", 1)
  ]);
  const arena = parseArenaText("A.................................................................................................B");
  const state = createMatchState({
    seed: 1,
    arena,
    entrants: [
      { id: "p1", name: "Bot p1", teamId: "A" },
      { id: "p2", name: "Bot p2", teamId: "B" }
    ]
  });
  state.result.finished = true;
  state.result.reason = "time_limit";

  const [alpha, beta] = state.robots;
  alpha.armour = 50;
  beta.armour = 50;
  alpha.battery = 200;
  beta.battery = 100;

  applyEliminationTiebreak(match, state);

  assert.equal(state.result.winnerRobotId, alpha.id, "higher battery wins when armour is tied");
});

test("applyEliminationTiebreak returns false when all robots are dead", () => {
  const match = makeMatch([
    makeParticipant("p1", "javascript", "A", 0),
    makeParticipant("p2", "javascript", "B", 1)
  ]);
  const arena = parseArenaText("A.................................................................................................B");
  const state = createMatchState({
    seed: 1,
    arena,
    entrants: [
      { id: "p1", name: "Bot p1", teamId: "A" },
      { id: "p2", name: "Bot p2", teamId: "B" }
    ]
  });
  state.result.finished = true;
  state.result.reason = "time_limit";
  state.robots.forEach((r) => { r.alive = false; });

  const applied = applyEliminationTiebreak(match, state);
  assert.equal(applied, false);
  assert.equal(state.result.winnerRobotId, null);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd H:/Code/pcrobots && npm test 2>&1 | grep -E "(execution.test|FAIL|pass)" | head -20
```

Expected: test file runs, unsupported language test passes immediately (function already throws), battery test may fail if `applyEliminationTiebreak` is not exported from `execution.ts`.

- [ ] **Step 3: Ensure `applyEliminationTiebreak` is exported from `execution.ts`**

Check line 55 of `packages/platform/src/execution.ts` — it already has `export function applyEliminationTiebreak`. No change needed.

- [ ] **Step 4: Run full test suite**

```bash
cd H:/Code/pcrobots && npm test 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/platform/src/execution.test.ts
git commit -m "test: add unsupported language and tiebreak edge case coverage"
```

---

## Final Verification

- [ ] **Run full check + test + build**

```bash
cd H:/Code/pcrobots && npm run check && npm test && npm run build 2>&1 | tail -40
```

Expected: no errors, all tests pass, build succeeds.

- [ ] **Push branch**

```bash
git push
```
