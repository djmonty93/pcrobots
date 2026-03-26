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
  type AccessScope,
  createLadder,
  createLadderChallenge,
  createMatchQueue,
  createTournament,
  Database,
  executeStoredMatch,
  queueMatchRun,
  getLadder,
  getTournament,
  listLadders,
  listPendingTournamentMatches,
  listTournaments,
  type CreateArenaInput,
  type CreateBotInput,
  type CreateUserInput,
  type CreateMatchInput,
  type CreateLadderInput,
  type CreateTournamentInput,
  type LadderRecord,
  type MatchRecord,
  type SupportedLanguage,
  type UpdateUserInput,
  type UserRecord,
  type UserRole,
  retry,
  type TeamId,
  type TournamentFormat,
  type TournamentRecord
} from "@pcrobots/platform";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://pcrobots:pcrobots@localhost:5432/pcrobots";
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const db = new Database(databaseUrl);
const matchQueue = createMatchQueue(redisUrl);

await retry(async () => {
  await db.migrate();
  await matchQueue.waitUntilReady();
}, { label: "api bootstrap" });

const supportedLanguages = ["javascript", "typescript", "python"] as const;
const supportedModes = ["live", "queued", "ladder", "round-robin", "single-elimination", "double-elimination"] as const;
const supportedTournamentFormats = ["round-robin", "single-elimination", "double-elimination"] as const;
const supportedTeams = ["A", "B", "C"] as const;
const supportedRoles = ["admin", "user"] as const;
const authRateLimitWindowMs = Number(process.env.PCROBOTS_AUTH_RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000);
const authRateLimitMaxAttempts = Number(process.env.PCROBOTS_AUTH_RATE_LIMIT_MAX_ATTEMPTS ?? 10);
const corsOrigin = process.env.PCROBOTS_CORS_ORIGIN ?? "*";
const trustProxy = process.env.PCROBOTS_TRUST_PROXY === "true";
const authAttempts = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of authAttempts) {
    if (entry.resetAt <= now) authAttempts.delete(key);
  }
}, 5 * 60 * 1000).unref();

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

function unauthorized(message: string, details?: unknown): never {
  throw new HttpError(401, message, details);
}

function forbidden(message: string, details?: unknown): never {
  throw new HttpError(403, message, details);
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
  response.setHeader("access-control-allow-origin", corsOrigin);
  response.setHeader("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization,content-type");
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
  let totalBytes = 0;
  const maxBytes = 1024 * 1024; // 1 MB

  try {
    for await (const chunk of request) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        throw new HttpError(413, "Request body too large (limit: 1 MB)");
      }
      chunks.push(buf);
    }
  } catch (cause) {
    if (cause instanceof HttpError) throw cause;
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

function expectString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    badRequest(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function expectOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return expectString(value, fieldName);
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

function expectRole(value: unknown): UserRole {
  if (typeof value !== "string" || !supportedRoles.includes(value as UserRole)) {
    badRequest(`role must be one of: ${supportedRoles.join(", ")}`);
  }

  return value as UserRole;
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

function expectMaxTicks(value: unknown, fallback?: number): number {
  const ticks = expectInteger(value, "maxTicks", fallback);
  if (ticks < 1 || ticks > 10_000) {
    badRequest("maxTicks must be between 1 and 10000");
  }

  return ticks;
}

function parseCreateBotInput(body: unknown): CreateBotInput {
  if (!isRecord(body)) {
    badRequest("bot payload must be a JSON object");
  }

  const source = expectString(body.source, "source");
  if (source.length > 100_000) {
    badRequest("source must not exceed 100,000 characters");
  }

  const name = expectString(body.name, "name");
  if (name.length > 200) badRequest("name must not exceed 200 characters");
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > 2000) badRequest("description must not exceed 2000 characters");

  return { name, description, language: expectLanguage(body.language), source };
}

function parseCreateArenaInput(body: unknown): CreateArenaInput {
  if (!isRecord(body)) {
    badRequest("arena payload must be a JSON object");
  }

  const text = expectString(body.text, "text");
  if (text.length > 100_000) {
    badRequest("text must not exceed 100,000 characters");
  }

  const name = expectString(body.name, "name");
  if (name.length > 200) badRequest("name must not exceed 200 characters");
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > 2000) badRequest("description must not exceed 2000 characters");

  return { name, description, text };
}

function parseCreateMatchRequest(body: unknown): { input: CreateMatchInput; enqueue: boolean } {
  if (!isRecord(body)) {
    badRequest("match payload must be a JSON object");
  }

  const participantsValue = body.participants;
  if (!Array.isArray(participantsValue) || participantsValue.length < 2) {
    badRequest("participants must contain at least two entries");
  }

  const matchName = expectString(body.name, "name");
  if (matchName.length > 200) badRequest("name must not exceed 200 characters");

  return {
    enqueue: expectBoolean(body.enqueue, false),
    input: {
      name: matchName,
      mode: expectMode(body.mode),
      arenaId: typeof body.arenaId === "string" ? body.arenaId.trim() : undefined,
      arenaRevisionId: typeof body.arenaRevisionId === "string" ? body.arenaRevisionId.trim() : undefined,
      seed: expectInteger(body.seed, "seed", 1),
      maxTicks: expectMaxTicks(body.maxTicks, 200),
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

  const ladderName = expectString(body.name, "name");
  if (ladderName.length > 200) badRequest("name must not exceed 200 characters");
  const ladderDescription = typeof body.description === "string" ? body.description.trim() : "";
  if (ladderDescription.length > 2000) badRequest("description must not exceed 2000 characters");

  return {
    ownerUserId: "",
    name: ladderName,
    description: ladderDescription,
    arenaId: typeof body.arenaId === "string" ? body.arenaId.trim() : undefined,
    arenaRevisionId: typeof body.arenaRevisionId === "string" ? body.arenaRevisionId.trim() : undefined,
    maxTicks: expectMaxTicks(body.maxTicks, 200),
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

  const tournamentName = expectString(body.name, "name");
  if (tournamentName.length > 200) badRequest("name must not exceed 200 characters");
  const tournamentDescription = typeof body.description === "string" ? body.description.trim() : "";
  if (tournamentDescription.length > 2000) badRequest("description must not exceed 2000 characters");

  return {
    ownerUserId: "",
    name: tournamentName,
    description: tournamentDescription,
    format: expectTournamentFormat(body.format),
    arenaId: typeof body.arenaId === "string" ? body.arenaId.trim() : undefined,
    arenaRevisionId: typeof body.arenaRevisionId === "string" ? body.arenaRevisionId.trim() : undefined,
    maxTicks: expectMaxTicks(body.maxTicks, 200),
    seedBase: expectInteger(body.seedBase, "seedBase", 1),
    entryBotIds
  };
}

function parseLoginRequest(body: unknown): { email: string; password: string } {
  if (!isRecord(body)) {
    badRequest("login payload must be a JSON object");
  }

  return {
    email: expectString(body.email, "email"),
    password: expectString(body.password, "password")
  };
}

function parseCreateUserInput(body: unknown): CreateUserInput {
  if (!isRecord(body)) {
    badRequest("user payload must be a JSON object");
  }

  return {
    email: expectString(body.email, "email"),
    password: expectString(body.password, "password"),
    role: expectRole(body.role),
    isActive: typeof body.isActive === "boolean" ? body.isActive : true
  };
}

function parseRegisterRequest(body: unknown): { email: string; password: string } {
  if (!isRecord(body)) {
    badRequest("registration payload must be a JSON object");
  }

  return {
    email: expectString(body.email, "email"),
    password: expectString(body.password, "password")
  };
}

function parseUpdateUserInput(body: unknown): UpdateUserInput {
  if (!isRecord(body)) {
    badRequest("user payload must be a JSON object");
  }

  return {
    email: expectOptionalString(body.email, "email"),
    password: expectOptionalString(body.password, "password"),
    role: body.role === undefined ? undefined : expectRole(body.role),
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined
  };
}

function parseChangePasswordRequest(body: unknown): { currentPassword: string; nextPassword: string } {
  if (!isRecord(body)) {
    badRequest("password payload must be a JSON object");
  }

  return {
    currentPassword: expectString(body.currentPassword, "currentPassword"),
    nextPassword: expectString(body.nextPassword, "nextPassword")
  };
}

function parseOwnershipTransferRequest(body: unknown): { targetUserId: string } {
  if (!isRecord(body)) {
    badRequest("transfer payload must be a JSON object");
  }

  return {
    targetUserId: expectString(body.targetUserId, "targetUserId")
  };
}

function toScope(user: UserRecord): AccessScope {
  return { userId: user.id, role: user.role };
}

function extractBearerToken(request: IncomingMessage): string | null {
  const header = request.headers.authorization;
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

async function requireUser(request: IncomingMessage): Promise<{ token: string; user: UserRecord; scope: AccessScope }> {
  const token = extractBearerToken(request);
  if (!token) {
    unauthorized("authentication required");
  }

  const user = await db.getUserBySessionToken(token);
  if (!user) {
    unauthorized("invalid or expired session");
  }

  return {
    token,
    user,
    scope: toScope(user)
  };
}

function requireAdmin(user: UserRecord): void {
  if (user.role !== "admin") {
    forbidden("admin access required");
  }
}

function getClientAddress(request: IncomingMessage): string {
  if (trustProxy) {
    const forwarded = request.headers["x-forwarded-for"];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
    if (first?.trim()) return first.trim();
  }
  return request.socket.remoteAddress ?? "unknown";
}

function getAuthAttemptKey(request: IncomingMessage, email: string): string {
  return `${getClientAddress(request)}:${email.trim().toLowerCase()}`;
}

function consumeAuthAttempt(key: string): void {
  const now = Date.now();
  const current = authAttempts.get(key);
  if (!current || current.resetAt <= now) {
    authAttempts.set(key, { count: 1, resetAt: now + authRateLimitWindowMs });
    return;
  }

  if (current.count >= authRateLimitMaxAttempts) {
    throw new HttpError(429, "Too many authentication attempts. Try again later.");
  }

  current.count += 1;
  authAttempts.set(key, current);
}

function clearAuthAttempts(key: string): void {
  authAttempts.delete(key);
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

async function ensureMatchResourcesAccessible(user: UserRecord, input: CreateMatchInput): Promise<void> {
  const scope = toScope(user);

  if (input.arenaRevisionId) {
    const arenaRevision = await db.getArenaRevision(input.arenaRevisionId, scope);
    if (!arenaRevision) {
      badRequest(`Arena revision ${input.arenaRevisionId} was not found`);
    }
  } else if (input.arenaId) {
    const arena = await db.getArena(input.arenaId, scope);
    if (!arena) {
      badRequest(`Arena ${input.arenaId} was not found`);
    }
  } else {
    badRequest("arenaId or arenaRevisionId is required");
  }

  for (const participant of input.participants) {
    if (participant.botRevisionId) {
      const botRevision = await db.getBotRevision(participant.botRevisionId, scope);
      if (!botRevision) {
        badRequest(`Bot revision ${participant.botRevisionId} was not found`);
      }
      continue;
    }

    if (!participant.botId) {
      badRequest("Each participant must provide botId or botRevisionId");
    }

    const bot = await db.getBot(participant.botId, scope);
    if (!bot) {
      badRequest(`Bot ${participant.botId} was not found`);
    }
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
    payload: { queued: false, match: (await executeStoredMatch(db, match.id)).match }
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
        status: "multi-user competition scaffold",
        supportedLanguages,
        competitionModes: supportedModes,
        tournamentFormats: supportedTournamentFormats,
        roles: supportedRoles,
        endpoints: [
          "GET /health",
          "GET /api/spec",
          "POST /api/auth/login",
          "POST /api/auth/register",
          "POST /api/auth/logout",
          "GET /api/auth/me",
          "PUT /api/auth/me/password",
          "GET /api/users",
          "POST /api/users",
          "PUT /api/users/:id",
          "DELETE /api/users/:id",
          "POST /api/users/:id/transfer-ownership",
          "GET /api/bots",
          "POST /api/bots",
          "GET /api/bots/:id",
          "PUT /api/bots/:id",
          "DELETE /api/bots/:id",
          "GET /api/arenas",
          "POST /api/arenas",
          "GET /api/arenas/:id",
          "PUT /api/arenas/:id",
          "DELETE /api/arenas/:id",
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

    if (method === "POST" && path === "/api/auth/login") {
      const body = await readJsonBody(request);
      const credentials = parseLoginRequest(body);
      const rateLimitKey = getAuthAttemptKey(request, credentials.email);
      consumeAuthAttempt(rateLimitKey);
      const user = await db.authenticateUser(credentials.email, credentials.password);
      if (!user) {
        unauthorized("invalid email or password");
      }

      const session = await db.createSession(user.id);
      clearAuthAttempts(rateLimitKey);
      sendJson(response, 200, session);
      return;
    }

    if (method === "POST" && path === "/api/auth/register") {
      const body = await readJsonBody(request);
      const input = parseRegisterRequest(body);
      const rateLimitKey = getAuthAttemptKey(request, input.email);
      consumeAuthAttempt(rateLimitKey);

      try {
        const user = await db.createUser({
          email: input.email,
          password: input.password,
          role: "user",
          isActive: true
        });
        const session = await db.createSession(user.id);
        clearAuthAttempts(rateLimitKey);
        sendJson(response, 201, session);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes("already exists") ||
          message.includes("Password must be")
        ) {
          conflict(message);
        }
        throw error;
      }
      return;
    }

    if (!path.startsWith("/api/")) {
      sendError(response, 404, "Not found");
      return;
    }

    const auth = await requireUser(request);

    if (method === "POST" && path === "/api/auth/logout") {
      await db.deleteSession(auth.token);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (method === "GET" && path === "/api/auth/me") {
      sendJson(response, 200, auth.user);
      return;
    }

    if (method === "PUT" && path === "/api/auth/me/password") {
      const body = await readJsonBody(request);
      const input = parseChangePasswordRequest(body);
      const matches = await db.verifyUserPassword(auth.user.id, input.currentPassword);
      if (!matches) {
        unauthorized("current password is incorrect");
      }

      await db.updateOwnPassword(auth.user.id, input.nextPassword);
      await db.deleteSessionsForUser(auth.user.id, auth.token);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (method === "GET" && path === "/api/users") {
      requireAdmin(auth.user);
      sendJson(response, 200, await db.listUsers());
      return;
    }

    if (method === "POST" && path === "/api/users") {
      requireAdmin(auth.user);
      const body = await readJsonBody(request);
      const input = parseCreateUserInput(body);
      try {
        sendJson(response, 201, await db.createUser(input));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("already exists") || message.includes("Password must be")) {
          conflict(message);
        }
        throw error;
      }
      return;
    }

    if (method === "PUT" && segments[0] === "api" && segments[1] === "users" && segments.length === 3) {
      requireAdmin(auth.user);
      const existingUser = await db.getUser(segments[2]);
      if (!existingUser) {
        sendError(response, 404, `User ${segments[2]} was not found`);
        return;
      }

      const body = await readJsonBody(request);
      const input = parseUpdateUserInput(body);
      try {
        const updated = await db.updateUser(segments[2], input);
        if (input.password) {
          try {
            await db.deleteSessionsForUser(segments[2]);
          } catch (sessionError) {
            console.error("failed to revoke sessions after admin password change", { userId: segments[2], error: sessionError });
            sendError(response, 500, "Password updated but session revocation failed. Existing sessions may still be active.");
            return;
          }
        }
        sendJson(response, 200, updated);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes("already exists") ||
          message.includes("At least one active admin") ||
          message.includes("Password must be")
        ) {
          conflict(message);
        }
        throw error;
      }
      return;
    }

    if (method === "DELETE" && segments[0] === "api" && segments[1] === "users" && segments.length === 3) {
      requireAdmin(auth.user);
      if (segments[2] === auth.user.id) {
        conflict("You cannot delete the account you are currently signed into");
      }

      try {
        const deleted = await db.deleteUser(segments[2]);
        if (!deleted) {
          sendError(response, 404, `User ${segments[2]} was not found`);
          return;
        }

        sendJson(response, 200, { deleted: true, id: segments[2] });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("cannot be deleted") || message.includes("At least one active admin")) {
          conflict(message);
        }
        throw error;
      }
      return;
    }

    if (method === "POST" && segments[0] === "api" && segments[1] === "users" && segments[3] === "transfer-ownership" && segments.length === 4) {
      requireAdmin(auth.user);
      if (segments[2] === auth.user.id) {
        conflict("Transfer ownership from another account or sign in as a different admin");
      }

      const body = await readJsonBody(request);
      const input = parseOwnershipTransferRequest(body);

      try {
        sendJson(response, 200, await db.transferOwnership(segments[2], input.targetUserId));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes("must be different") ||
          message.includes("was not found") ||
          message.includes("is inactive")
        ) {
          conflict(message);
        }
        throw error;
      }
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
      sendJson(response, 200, await db.listBots(auth.scope));
      return;
    }

    if (method === "POST" && path === "/api/bots") {
      const body = await readJsonBody(request);
      const input = parseCreateBotInput(body);
      sendJson(response, 201, await db.createBot(input, auth.user.id));
      return;
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "bots" && segments.length === 3) {
      const bot = await db.getBot(segments[2], auth.scope);
      if (!bot) {
        sendError(response, 404, `Bot ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, bot);
      return;
    }

    if (method === "PUT" && segments[0] === "api" && segments[1] === "bots" && segments.length === 3) {
      const existingBot = await db.getBot(segments[2], auth.scope);
      if (!existingBot) {
        sendError(response, 404, `Bot ${segments[2]} was not found`);
        return;
      }

      const body = await readJsonBody(request);
      const input = parseCreateBotInput(body);
      sendJson(response, 200, await db.updateBot(segments[2], input));
      return;
    }

    if (method === "DELETE" && segments[0] === "api" && segments[1] === "bots" && segments.length === 3) {
      const existingBot = await db.getBot(segments[2], auth.scope);
      if (!existingBot) {
        sendError(response, 404, `Bot ${segments[2]} was not found`);
        return;
      }

      let deleted: boolean;
      try {
        deleted = await db.deleteBot(segments[2]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("cannot be deleted")) {
          conflict(message);
        }
        throw error;
      }

      if (!deleted) {
        sendError(response, 404, `Bot ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, { deleted: true, id: segments[2] });
      return;
    }

    if (method === "GET" && path === "/api/arenas") {
      sendJson(response, 200, await db.listArenas(auth.scope));
      return;
    }

    if (method === "POST" && path === "/api/arenas") {
      const body = await readJsonBody(request);
      const input = parseCreateArenaInput(body);
      parseArenaText(input.text);
      sendJson(response, 201, await db.createArena(input, auth.user.id));
      return;
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "arenas" && segments.length === 3) {
      const arena = await db.getArena(segments[2], auth.scope);
      if (!arena) {
        sendError(response, 404, `Arena ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, arena);
      return;
    }

    if (method === "PUT" && segments[0] === "api" && segments[1] === "arenas" && segments.length === 3) {
      const existingArena = await db.getArena(segments[2], auth.scope);
      if (!existingArena) {
        sendError(response, 404, `Arena ${segments[2]} was not found`);
        return;
      }

      const body = await readJsonBody(request);
      const input = parseCreateArenaInput(body);
      parseArenaText(input.text);
      sendJson(response, 200, await db.updateArena(segments[2], input));
      return;
    }

    if (method === "DELETE" && segments[0] === "api" && segments[1] === "arenas" && segments.length === 3) {
      const existingArena = await db.getArena(segments[2], auth.scope);
      if (!existingArena) {
        sendError(response, 404, `Arena ${segments[2]} was not found`);
        return;
      }

      let deleted: boolean;
      try {
        deleted = await db.deleteArena(segments[2]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("cannot be deleted")) {
          conflict(message);
        }
        throw error;
      }

      if (!deleted) {
        sendError(response, 404, `Arena ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, { deleted: true, id: segments[2] });
      return;
    }

    if (method === "GET" && path === "/api/matches") {
      sendJson(response, 200, await db.listMatches(auth.scope));
      return;
    }

    if (method === "POST" && path === "/api/matches") {
      const body = await readJsonBody(request);
      const requestPayload = parseCreateMatchRequest(body);
      await ensureMatchResourcesAccessible(auth.user, requestPayload.input);
      const match = await db.createMatch(requestPayload.input, auth.user.id);
      const outcome = await runOrQueueMatch(match, requestPayload.enqueue);
      sendJson(response, requestPayload.enqueue || match.mode === "queued" ? 202 : 201, {
        match,
        run: outcome.payload
      });
      return;
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "matches" && segments.length === 3) {
      const match = await db.getMatch(segments[2], auth.scope);
      if (!match) {
        sendError(response, 404, `Match ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, match);
      return;
    }

    if (method === "POST" && segments[0] === "api" && segments[1] === "matches" && segments[3] === "run" && segments.length === 4) {
      const match = await db.getMatch(segments[2], auth.scope);
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
      sendJson(response, 200, await listLadders(db, auth.scope));
      return;
    }

    if (method === "POST" && path === "/api/ladders") {
      const body = await readJsonBody(request);
      const input = parseCreateLadderInput(body);
      if (input.arenaRevisionId) {
        const arenaRevision = await db.getArenaRevision(input.arenaRevisionId, auth.scope);
        if (!arenaRevision) {
          badRequest(`Arena revision ${input.arenaRevisionId} was not found`);
        }
      } else if (input.arenaId) {
        const arena = await db.getArena(input.arenaId, auth.scope);
        if (!arena) {
          badRequest(`Arena ${input.arenaId} was not found`);
        }
      }

      for (const botId of input.entryBotIds) {
        const bot = await db.getBot(botId, auth.scope);
        if (!bot) {
          badRequest(`Bot ${botId} was not found`);
        }
      }

      sendJson(response, 201, await createLadder(db, { ...input, ownerUserId: auth.user.id }));
      return;
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "ladders" && segments.length === 3) {
      const ladder = await getLadder(db, segments[2], auth.scope);
      if (!ladder) {
        sendError(response, 404, `Ladder ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, ladder);
      return;
    }

    if (method === "POST" && segments[0] === "api" && segments[1] === "ladders" && segments[3] === "challenge" && segments.length === 4) {
      const ladder = await getLadder(db, segments[2], auth.scope);
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
      sendJson(response, 200, await listTournaments(db, auth.scope));
      return;
    }

    if (method === "POST" && path === "/api/tournaments") {
      const body = await readJsonBody(request);
      const input = parseCreateTournamentInput(body);
      if (input.arenaRevisionId) {
        const arenaRevision = await db.getArenaRevision(input.arenaRevisionId, auth.scope);
        if (!arenaRevision) {
          badRequest(`Arena revision ${input.arenaRevisionId} was not found`);
        }
      } else if (input.arenaId) {
        const arena = await db.getArena(input.arenaId, auth.scope);
        if (!arena) {
          badRequest(`Arena ${input.arenaId} was not found`);
        }
      }

      for (const botId of input.entryBotIds) {
        const bot = await db.getBot(botId, auth.scope);
        if (!bot) {
          badRequest(`Bot ${botId} was not found`);
        }
      }

      sendJson(response, 201, await createTournament(db, { ...input, ownerUserId: auth.user.id }));
      return;
    }

    if (method === "GET" && segments[0] === "api" && segments[1] === "tournaments" && segments.length === 3) {
      const tournament = await getTournament(db, segments[2], auth.scope);
      if (!tournament) {
        sendError(response, 404, `Tournament ${segments[2]} was not found`);
        return;
      }

      sendJson(response, 200, tournament);
      return;
    }

    if (method === "POST" && segments[0] === "api" && segments[1] === "tournaments" && segments[3] === "run-pending" && segments.length === 4) {
      const tournament = await getTournament(db, segments[2], auth.scope);
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

    console.error("unhandled request error", { method: request.method, path: request.url, error });
    sendError(response, 500, "Internal server error");
  }
});

if (isNaN(authRateLimitWindowMs) || authRateLimitWindowMs <= 0) {
  console.error("invalid PCROBOTS_AUTH_RATE_LIMIT_WINDOW_MS", process.env.PCROBOTS_AUTH_RATE_LIMIT_WINDOW_MS);
  process.exit(1);
}
if (isNaN(authRateLimitMaxAttempts) || authRateLimitMaxAttempts <= 0) {
  console.error("invalid PCROBOTS_AUTH_RATE_LIMIT_MAX_ATTEMPTS", process.env.PCROBOTS_AUTH_RATE_LIMIT_MAX_ATTEMPTS);
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("invalid PORT value", { PORT: process.env.PORT });
  process.exit(1);
}
server.listen(port, () => {
  console.log(`pcrobots api listening on ${port}`);
});

server.on("error", (error) => {
  console.error("http server error", {
    code: (error as NodeJS.ErrnoException).code,
    message: error.message
  });
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await Promise.allSettled([matchQueue.close(), db.close()]);
    process.exit(0);
  });
}


