import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  createMatchState,
  createRobotTurnSnapshot,
  parseArenaText,
  stepMatch,
  type CommandMap,
  type MatchState
} from "@pcrobots/engine";
import { loadJavaScriptBot, loadPythonBot } from "@pcrobots/bot-sdk";
import {
  createLadder,
  createLadderChallenge,
  createMatchQueue,
  createTournament,
  Database,
  enqueueMatchRun,
  executeStoredMatch,
  getLadder,
  getTournament,
  listLadders,
  listPendingTournamentMatches,
  listTournaments,
  type CreateArenaInput,
  type CreateBotInput,
  type CreateMatchInput,
  type CreateLadderInput,
  type CreateTournamentInput,
  type LadderRecord,
  type MatchRecord,
  type SupportedLanguage,
  type TeamId,
  type TournamentFormat,
  type TournamentRecord
} from "@pcrobots/platform";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://pcrobots:pcrobots@localhost:5432/pcrobots";
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const db = new Database(databaseUrl);
await db.migrate();
const matchQueue = createMatchQueue(redisUrl);

const supportedLanguages = ["javascript", "typescript", "python"] as const;
const supportedModes = ["live", "queued", "ladder", "round-robin", "single-elimination", "double-elimination"] as const;
const supportedTournamentFormats = ["round-robin", "single-elimination", "double-elimination"] as const;
const supportedTeams = ["A", "B", "C"] as const;

type SupportedMode = (typeof supportedModes)[number];

class HttpError extends Error {
  readonly statusCode: number;
  readonly details: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details ?? null;
  }
}

function badRequest(message: string, details?: unknown): never {
  throw new HttpError(400, message, details);
}

function conflict(message: string, details?: unknown): never {
  throw new HttpError(409, message, details);
}

function createDemoArenaText(): string {
  const lines = Array.from({ length: 100 }, () => ".".repeat(100));
  lines[10] = `A${".".repeat(97)}B`;
  lines[50] = `${".".repeat(40)}X${".".repeat(59)}`;
  return lines.join("\n");
}

function createBattleArenaText(): string {
  const lines = Array.from({ length: 100 }, () => ".".repeat(100));
  lines[20] = `A...B${".".repeat(95)}`;
  return lines.join("\n");
}

function createRuntimeArenaText(): string {
  const lines = Array.from({ length: 100 }, () => ".".repeat(100));
  lines[10] = `A${".".repeat(20)}B${".".repeat(77)}`;
  lines[11] = `${".".repeat(6)}***${".".repeat(91)}`;
  lines[12] = `${".".repeat(12)}R${".".repeat(87)}`;
  return lines.join("\n");
}

function createDemoMatch(): MatchState {
  const arena = parseArenaText(createDemoArenaText());
  const state = createMatchState({
    seed: 42,
    arena,
    entrants: [
      { id: "alpha", name: "Alpha", teamId: "A" },
      { id: "beta", name: "Beta", teamId: "B" }
    ]
  });

  const commands: CommandMap = {
    alpha: { kind: "movement", targetSpeed: 50, heading: 0 },
    beta: { kind: "movement", targetSpeed: 50, heading: 180 }
  };

  stepMatch(state, commands);
  return state;
}

function createDemoBattle(): MatchState {
  const arena = parseArenaText(createBattleArenaText());
  const state = createMatchState({
    seed: 7,
    arena,
    entrants: [
      { id: "alpha", name: "Alpha", teamId: "A" },
      { id: "beta", name: "Beta", teamId: "B" }
    ]
  });

  for (let tick = 0; tick < 80 && !state.result.finished; tick += 1) {
    const commands: CommandMap =
      tick === 0
        ? {
            alpha: { kind: "shoot", heading: 0, range: 40 },
            beta: { kind: "noop" }
          }
        : {
            alpha: { kind: "noop" },
            beta: { kind: "noop" }
          };

    stepMatch(state, { commands, timeLimit: 80 });
  }

  return state;
}

function createRuntimeDemo(): MatchState {
  const arena = parseArenaText(createRuntimeArenaText());
  const state = createMatchState({
    seed: 9,
    arena,
    entrants: [
      { id: "alpha", name: "Alpha", teamId: "A", config: { invisibility: true } },
      { id: "beta", name: "Beta", teamId: "B", config: { invisibility: true } }
    ]
  });

  const alpha = loadJavaScriptBot("alpha", {
    language: "javascript",
    source: `
      module.exports = function onTurn(snapshot) {
        if (snapshot.tick === 0) return { kind: "scan", heading: 0, resolution: 12 };
        if (snapshot.tick === 1) return { kind: "shoot", heading: 0, range: 40 };
        if (snapshot.tick === 2) return { kind: "pickup_obstacle", direction: 0 };
        return { kind: "movement", targetSpeed: 30, heading: 0 };
      };
    `
  });

  const beta = loadPythonBot("beta", {
    language: "python",
    source: `
from typing import Any

def on_turn(snapshot: dict[str, Any]):
    tick = snapshot["tick"]
    if tick < 3:
        return {"kind": "invisibility", "enabled": True}
    return {"kind": "movement", "targetSpeed": 20, "heading": 180}
`
  });

  for (let tick = 0; tick < 20 && !state.result.finished; tick += 1) {
    const commands: CommandMap = {
      alpha: alpha.runTurn(createRobotTurnSnapshot(state, "alpha")),
      beta: beta.runTurn(createRobotTurnSnapshot(state, "beta"))
    };

    stepMatch(state, { commands, timeLimit: 20 });
  }

  return state;
}

function applyCors(response: ServerResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  applyCors(response);
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function sendError(response: ServerResponse, statusCode: number, message: string, details?: unknown): void {
  sendJson(response, statusCode, {
    error: message,
    details: details ?? null
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
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

function expectString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    badRequest(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function expectInteger(value: unknown, fieldName: string, fallback?: number): number {
  const candidate = value ?? fallback;
  if (typeof candidate !== "number" || !Number.isInteger(candidate)) {
    badRequest(`${fieldName} must be an integer`);
  }

  return candidate;
}

function expectBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function expectStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    badRequest(`${fieldName} must be an array of non-empty strings`);
  }

  return value.map((entry) => entry.trim());
}

function expectLanguage(value: unknown): SupportedLanguage {
  if (typeof value !== "string" || !supportedLanguages.includes(value as SupportedLanguage)) {
    badRequest(`language must be one of: ${supportedLanguages.join(", ")}`);
  }

  return value as SupportedLanguage;
}

function expectMode(value: unknown, fallback: SupportedMode = "live"): SupportedMode {
  const candidate = (value ?? fallback) as string;
  if (!supportedModes.includes(candidate as SupportedMode)) {
    badRequest(`mode must be one of: ${supportedModes.join(", ")}`);
  }

  return candidate as SupportedMode;
}

function expectTournamentFormat(value: unknown): TournamentFormat {
  if (typeof value !== "string" || !supportedTournamentFormats.includes(value as TournamentFormat)) {
    badRequest(`format must be one of: ${supportedTournamentFormats.join(", ")}`);
  }

  return value as TournamentFormat;
}

function expectTeamId(value: unknown, fieldName: string): TeamId {
  if (typeof value !== "string" || !supportedTeams.includes(value as TeamId)) {
    badRequest(`${fieldName} must be one of: ${supportedTeams.join(", ")}`);
  }

  return value as TeamId;
}

function parseCreateBotInput(body: unknown): CreateBotInput {
  if (!isRecord(body)) {
    badRequest("bot payload must be a JSON object");
  }

  return {
    name: expectString(body.name, "name"),
    description: typeof body.description === "string" ? body.description.trim() : "",
    language: expectLanguage(body.language),
    source: expectString(body.source, "source")
  };
}

function parseCreateArenaInput(body: unknown): CreateArenaInput {
  if (!isRecord(body)) {
    badRequest("arena payload must be a JSON object");
  }

  return {
    name: expectString(body.name, "name"),
    description: typeof body.description === "string" ? body.description.trim() : "",
    text: expectString(body.text, "text")
  };
}

function parseCreateMatchRequest(body: unknown): { input: CreateMatchInput; enqueue: boolean } {
  if (!isRecord(body)) {
    badRequest("match payload must be a JSON object");
  }

  const participantsValue = body.participants;
  if (!Array.isArray(participantsValue) || participantsValue.length < 2) {
    badRequest("participants must contain at least two entries");
  }

  return {
    enqueue: expectBoolean(body.enqueue, false),
    input: {
      name: expectString(body.name, "name"),
      mode: expectMode(body.mode),
      arenaId: typeof body.arenaId === "string" ? body.arenaId.trim() : undefined,
      arenaRevisionId: typeof body.arenaRevisionId === "string" ? body.arenaRevisionId.trim() : undefined,
      seed: expectInteger(body.seed, "seed", 1),
      maxTicks: expectInteger(body.maxTicks, "maxTicks", 200),
      participants: participantsValue.map((participant, index) => {
        if (!isRecord(participant)) {
          badRequest(`participants[${index}] must be a JSON object`);
        }

        const botId = typeof participant.botId === "string" ? participant.botId.trim() : undefined;
        const botRevisionId = typeof participant.botRevisionId === "string" ? participant.botRevisionId.trim() : undefined;
        if (!botId && !botRevisionId) {
          badRequest(`participants[${index}] must include botId or botRevisionId`);
        }

        return {
          botId,
          botRevisionId,
          teamId: expectTeamId(participant.teamId, `participants[${index}].teamId`)
        };
      })
    }
  };
}

function parseCreateLadderInput(body: unknown): CreateLadderInput {
  if (!isRecord(body)) {
    badRequest("ladder payload must be a JSON object");
  }

  const entryBotIds = Array.from(new Set(expectStringArray(body.entryBotIds, "entryBotIds")));
  if (entryBotIds.length < 2) {
    badRequest("A ladder requires at least two bots");
  }

  return {
    name: expectString(body.name, "name"),
    description: typeof body.description === "string" ? body.description.trim() : "",
    arenaId: typeof body.arenaId === "string" ? body.arenaId.trim() : undefined,
    arenaRevisionId: typeof body.arenaRevisionId === "string" ? body.arenaRevisionId.trim() : undefined,
    maxTicks: expectInteger(body.maxTicks, "maxTicks", 200),
    entryBotIds
  };
}

function parseCreateTournamentInput(body: unknown): CreateTournamentInput {
  if (!isRecord(body)) {
    badRequest("tournament payload must be a JSON object");
  }

  const entryBotIds = Array.from(new Set(expectStringArray(body.entryBotIds, "entryBotIds")));
  if (entryBotIds.length < 2) {
    badRequest("A tournament requires at least two bots");
  }

  return {
    name: expectString(body.name, "name"),
    description: typeof body.description === "string" ? body.description.trim() : "",
    format: expectTournamentFormat(body.format),
    arenaId: typeof body.arenaId === "string" ? body.arenaId.trim() : undefined,
    arenaRevisionId: typeof body.arenaRevisionId === "string" ? body.arenaRevisionId.trim() : undefined,
    maxTicks: expectInteger(body.maxTicks, "maxTicks", 200),
    seedBase: expectInteger(body.seedBase, "seedBase", 1),
    entryBotIds
  };
}

function parseLadderChallengeRequest(body: unknown, ladder: LadderRecord): { seed: number; enqueue: boolean; entryAId?: string; entryBId?: string } {
  if (!isRecord(body)) {
    return { seed: 1, enqueue: false };
  }

  const entryAId = typeof body.entryAId === "string" ? body.entryAId.trim() : undefined;
  const entryBId = typeof body.entryBId === "string" ? body.entryBId.trim() : undefined;

  if ((entryAId && !entryBId) || (!entryAId && entryBId)) {
    badRequest("entryAId and entryBId must be provided together");
  }

  if (entryAId && !ladder.entries.some((entry) => entry.id === entryAId)) {
    badRequest(`Ladder entry ${entryAId} was not found`);
  }

  if (entryBId && !ladder.entries.some((entry) => entry.id === entryBId)) {
    badRequest(`Ladder entry ${entryBId} was not found`);
  }

  return {
    seed: expectInteger(body.seed, "seed", 1),
    enqueue: expectBoolean(body.enqueue, false),
    entryAId,
    entryBId
  };
}

function parseTournamentRunRequest(body: unknown, tournament: TournamentRecord): { enqueue: boolean; limit?: number; roundId?: string } {
  if (!isRecord(body)) {
    return { enqueue: false };
  }

  const roundId = typeof body.roundId === "string" ? body.roundId.trim() : undefined;
  if (roundId && !tournament.rounds.some((round) => round.id === roundId)) {
    badRequest(`Tournament round ${roundId} was not found`);
  }

  const limitValue = body.limit;
  let limit: number | undefined;
  if (limitValue !== undefined) {
    if (typeof limitValue !== "number" || !Number.isInteger(limitValue) || limitValue < 1) {
      badRequest("limit must be a positive integer");
    }
    limit = limitValue;
  }

  return {
    enqueue: expectBoolean(body.enqueue, false),
    limit,
    roundId
  };
}

async function queueStoredMatch(match: MatchRecord): Promise<{ matchId: string; jobId: string }> {
  if (match.status === "queued") {
    return {
      matchId: match.id,
      jobId: match.id
    };
  }

  if (match.status === "running" || match.status === "completed") {
    conflict(`Match ${match.id} cannot be queued from status ${match.status}`);
  }

  const transitioned = await db.transitionMatchStatus(match.id, [match.status], "queued");
  if (!transitioned) {
    const current = await db.getMatch(match.id);
    if (current?.status === "queued") {
      return {
        matchId: current.id,
        jobId: current.id
      };
    }

    conflict(`Match ${match.id} cannot be queued from status ${current?.status ?? "missing"}`);
  }

  try {
    const job = await enqueueMatchRun(matchQueue, match.id);
    return {
      matchId: match.id,
      jobId: String(job.id)
    };
  } catch (error) {
    await db.transitionMatchStatus(match.id, ["queued"], match.status);
    throw error;
  }
}

async function runOrQueueMatch(match: MatchRecord, forceQueue: boolean): Promise<{ statusCode: number; payload: unknown }> {
  if (forceQueue || match.mode === "queued") {
    const queued = await queueStoredMatch(match);
    return {
      statusCode: 202,
      payload: {
        queued: true,
        ...queued,
        status: "queued"
      }
    };
  }

  if (match.status === "queued" || match.status === "running" || match.status === "completed") {
    conflict(`Match ${match.id} cannot be run from status ${match.status}`);
  }

  return {
    statusCode: 200,
    payload: await executeStoredMatch(db, match.id)
  };
}

const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const method = request.method ?? "GET";
    const origin = `http://${request.headers.host ?? "localhost"}`;
    const url = new URL(request.url ?? "/", origin);
    const path = url.pathname;
    const segments = path.split("/").filter(Boolean);

    if (method === "OPTIONS") {
      applyCors(response);
      response.writeHead(204);
      response.end();
      return;
    }

    if (method === "GET" && path === "/health") {
      sendJson(response, 200, { ok: true, service: "api", database: "configured", queue: "configured" });
      return;
    }

    if (method === "GET" && path === "/api/spec") {
      sendJson(response, 200, {
        product: "pcrobots",
        status: "competition scaffold",
        supportedLanguages,
        competitionModes: supportedModes,
        tournamentFormats: supportedTournamentFormats,
        endpoints: [
          "GET /health",
          "GET /api/spec",
          "GET /api/bots",
          "POST /api/bots",
          "GET /api/bots/:id",
          "GET /api/arenas",
          "POST /api/arenas",
          "GET /api/arenas/:id",
          "GET /api/matches",
          "POST /api/matches",
          "GET /api/matches/:id",
          "POST /api/matches/:id/run",
          "GET /api/ladders",
          "POST /api/ladders",
          "GET /api/ladders/:id",
          "POST /api/ladders/:id/challenge",
          "GET /api/tournaments",
          "POST /api/tournaments",
          "GET /api/tournaments/:id",
          "POST /api/tournaments/:id/run-pending",
          "GET /api/demo-match",
          "GET /api/demo-battle",
          "GET /api/demo-runtime"
        ]
      });
      return;
    }

    if (method === "GET" && path === "/api/demo-match") {
      sendJson(response, 200, createDemoMatch());
      return;
    }

    if (method === "GET" && path === "/api/demo-battle") {
      sendJson(response, 200, createDemoBattle());
      return;
    }

    if (method === "GET" && path === "/api/demo-runtime") {
      sendJson(response, 200, createRuntimeDemo());
      return;
    }

    if (method === "GET" && path === "/api/bots") {
      sendJson(response, 200, await db.listBots());
      return;
    }

    if (method === "POST" && path === "/api/bots") {
      const body = await readJsonBody(request);
      const input = parseCreateBotInput(body);
      sendJson(response, 201, await db.createBot(input));
      return;
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "bots" && segments.length === 3) {
      const bot = await db.getBot(segments[2]);
      if (!bot) {
        sendError(response, 404, `Bot ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, bot);
      return;
    }

    if (method === "GET" && path === "/api/arenas") {
      sendJson(response, 200, await db.listArenas());
      return;
    }

    if (method === "POST" && path === "/api/arenas") {
      const body = await readJsonBody(request);
      const input = parseCreateArenaInput(body);
      parseArenaText(input.text);
      sendJson(response, 201, await db.createArena(input));
      return;
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "arenas" && segments.length === 3) {
      const arena = await db.getArena(segments[2]);
      if (!arena) {
        sendError(response, 404, `Arena ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, arena);
      return;
    }

    if (method === "GET" && path === "/api/matches") {
      sendJson(response, 200, await db.listMatches());
      return;
    }

    if (method === "POST" && path === "/api/matches") {
      const body = await readJsonBody(request);
      const requestPayload = parseCreateMatchRequest(body);
      const match = await db.createMatch(requestPayload.input);
      const outcome = await runOrQueueMatch(match, requestPayload.enqueue);
      sendJson(response, requestPayload.enqueue || match.mode === "queued" ? 202 : 201, {
        match,
        run: outcome.payload
      });
      return;
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "matches" && segments.length === 3) {
      const match = await db.getMatch(segments[2]);
      if (!match) {
        sendError(response, 404, `Match ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, match);
      return;
    }

    if (method === "POST" && segments[0] === "api" && segments[1] === "matches" && segments[3] === "run" && segments.length === 4) {
      const match = await db.getMatch(segments[2]);
      if (!match) {
        sendError(response, 404, `Match ${segments[2]} was not found`);
        return;
      }

      const forceQueue = url.searchParams.get("queue") === "true";
      const outcome = await runOrQueueMatch(match, forceQueue);
      sendJson(response, outcome.statusCode, outcome.payload);
      return;
    }

    if (method === "GET" && path === "/api/ladders") {
      sendJson(response, 200, await listLadders(db));
      return;
    }

    if (method === "POST" && path === "/api/ladders") {
      const body = await readJsonBody(request);
      const input = parseCreateLadderInput(body);
      sendJson(response, 201, await createLadder(db, input));
      return;
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "ladders" && segments.length === 3) {
      const ladder = await getLadder(db, segments[2]);
      if (!ladder) {
        sendError(response, 404, `Ladder ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, ladder);
      return;
    }

    if (method === "POST" && segments[0] === "api" && segments[1] === "ladders" && segments[3] === "challenge" && segments.length === 4) {
      const ladder = await getLadder(db, segments[2]);
      if (!ladder) {
        sendError(response, 404, `Ladder ${segments[2]} was not found`);
        return;
      }

      const body = await readJsonBody(request);
      const requestPayload = parseLadderChallengeRequest(body, ladder);
      const match = await createLadderChallenge(db, {
        ladderId: ladder.id,
        entryAId: requestPayload.entryAId,
        entryBId: requestPayload.entryBId,
        seed: requestPayload.seed,
        maxTicks: ladder.maxTicks
      });
      const outcome = await runOrQueueMatch(match, requestPayload.enqueue);
      sendJson(response, requestPayload.enqueue ? 202 : 201, {
        match,
        run: outcome.payload
      });
      return;
    }

    if (method === "GET" && path === "/api/tournaments") {
      sendJson(response, 200, await listTournaments(db));
      return;
    }

    if (method === "POST" && path === "/api/tournaments") {
      const body = await readJsonBody(request);
      const input = parseCreateTournamentInput(body);
      sendJson(response, 201, await createTournament(db, input));
      return;
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "tournaments" && segments.length === 3) {
      const tournament = await getTournament(db, segments[2]);
      if (!tournament) {
        sendError(response, 404, `Tournament ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, tournament);
      return;
    }

    if (method === "POST" && segments[0] === "api" && segments[1] === "tournaments" && segments[3] === "run-pending" && segments.length === 4) {
      const tournament = await getTournament(db, segments[2]);
      if (!tournament) {
        sendError(response, 404, `Tournament ${segments[2]} was not found`);
        return;
      }

      const body = await readJsonBody(request);
      const runRequest = parseTournamentRunRequest(body, tournament);
      const processedMatchIds: string[] = [];
      const jobIds: string[] = [];

      if (runRequest.enqueue) {
        const pendingMatches = await listPendingTournamentMatches(db, tournament.id, {
          roundId: runRequest.roundId,
          limit: runRequest.limit
        });

        for (const match of pendingMatches) {
          const queued = await queueStoredMatch(match);
          processedMatchIds.push(match.id);
          jobIds.push(queued.jobId);
        }
      } else {
        let remaining = runRequest.limit ?? Number.MAX_SAFE_INTEGER;
        while (remaining > 0) {
          const pendingMatches = await listPendingTournamentMatches(db, tournament.id, {
            roundId: runRequest.roundId,
            limit: 1
          });

          const nextMatch = pendingMatches[0];
          if (!nextMatch) {
            break;
          }

          await executeStoredMatch(db, nextMatch.id);
          processedMatchIds.push(nextMatch.id);
          remaining -= 1;
        }
      }

      const updatedTournament = await getTournament(db, tournament.id);
      if (!updatedTournament) {
        throw new Error(`Tournament ${tournament.id} disappeared after execution`);
      }

      sendJson(response, runRequest.enqueue ? 202 : 200, {
        tournament: updatedTournament,
        count: processedMatchIds.length,
        processedMatchIds,
        queued: runRequest.enqueue,
        jobIds: runRequest.enqueue ? jobIds : undefined
      });
      return;
    }

    sendJson(response, 200, {
      name: "pcrobots-api",
      message: "API scaffold is running",
      endpoints: [
        "/health",
        "/api/spec",
        "/api/bots",
        "/api/arenas",
        "/api/matches",
        "/api/ladders",
        "/api/tournaments",
        "/api/tournaments/:id/run-pending",
        "/api/demo-match",
        "/api/demo-battle",
        "/api/demo-runtime"
      ]
    });
  } catch (error) {
    if (error instanceof HttpError) {
      sendError(response, error.statusCode, error.message, error.details);
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    sendError(response, 500, message);
  }
});

const port = Number(process.env.PORT ?? 3001);
server.listen(port, () => {
  console.log(`pcrobots api listening on ${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await Promise.allSettled([matchQueue.close(), db.close()]);
    process.exit(0);
  });
}

