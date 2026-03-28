import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { type MatchEvent, type MatchResult } from "@pcrobots/engine";

import { bootstrapSql } from "./schema.js";
import {
  calculateRate,
  createEmptyBotStatsCounters,
  summarizeCompletedMatchStats,
  type BotStatsMode,
  type BotStatsScope
} from "./bot-stats.js";

export type SupportedLanguage = "javascript" | "typescript" | "python" | "lua" | "linux-x64-binary";
export type TeamId = "A" | "B" | "C";
export type UserRole = "admin" | "user";
export type MatchMode =
  | "live"
  | "queued"
  | "ladder"
  | "round-robin"
  | "single-elimination"
  | "double-elimination";
export type MatchStatus = "pending" | "queued" | "running" | "completed" | "failed";

const DEFAULT_ADMIN_EMAIL = "admin@pcrobots.local";
const DEFAULT_ADMIN_PASSWORD = "Admin1-change-me-now";
const DEFAULT_SESSION_TTL_DAYS = 30;
const MIN_PASSWORD_LENGTH = 12;

export interface AccessScope {
  userId: string;
  role: UserRole;
}

export interface UserRecord {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionRecord {
  token: string;
  expiresAt: string;
  user: UserRecord;
}

export interface OwnershipTransferResult {
  fromUserId: string;
  toUserId: string;
  bots: number;
  arenas: number;
  ladders: number;
  tournaments: number;
  matches: number;
}

export interface BotRevisionRecord {
  id: string;
  botId: string;
  language: SupportedLanguage;
  source: string;
  artifactFileName: string | null;
  artifactSha256: string | null;
  artifactSizeBytes: number | null;
  version: number;
  createdAt: string;
}

export interface BotStatsBucketRecord {
  id: string;
  botId: string;
  botRevisionId: string | null;
  scope: BotStatsScope;
  revisionVersion: number | null;
  label: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  shotsFired: number;
  shotsLanded: number;
  directHits: number;
  scans: number;
  kills: number;
  deaths: number;
  damageGiven: number;
  damageTaken: number;
  collisions: number;
  winRatePct: number;
  hitRatePct: number;
  survivalRatePct: number;
  lastMatchAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BotRecord {
  id: string;
  ownerUserId: string | null;
  ownerEmail: string | null;
  name: string;
  description: string;
  statsMode: BotStatsMode;
  createdAt: string;
  updatedAt: string;
  latestRevision: BotRevisionRecord;
  statsBuckets: BotStatsBucketRecord[];
  activeStats: BotStatsBucketRecord;
}

export interface ArenaRevisionRecord {
  id: string;
  arenaId: string;
  text: string;
  version: number;
  createdAt: string;
}

export interface ArenaRecord {
  id: string;
  ownerUserId: string | null;
  ownerEmail: string | null;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  latestRevision: ArenaRevisionRecord;
}

export interface MatchParticipantRecord {
  id: string;
  matchId: string;
  botRevisionId: string;
  botId: string;
  botName: string;
  language: SupportedLanguage;
  source: string;
  artifactBase64: string | null;
  artifactFileName: string | null;
  artifactSha256: string | null;
  artifactSizeBytes: number | null;
  revisionVersion: number;
  teamId: TeamId;
  slot: number;
}

export interface MatchRecord {
  id: string;
  ownerUserId?: string | null;
  ownerEmail?: string | null;
  name: string;
  mode: MatchMode;
  status: MatchStatus;
  ladderId: string | null;
  tournamentId: string | null;
  tournamentRoundId: string | null;
  roundSlot: number | null;
  arenaRevisionId: string;
  arenaId: string;
  arenaName: string;
  arenaText: string;
  seed: number;
  maxTicks: number;
  errorMessage: string | null;
  result: unknown;
  events: unknown;
  createdAt: string;
  updatedAt: string;
  participants: MatchParticipantRecord[];
}

export interface BotRevisionLookupRecord extends BotRevisionRecord {
  ownerUserId: string | null;
  ownerEmail: string | null;
}

export interface ArenaRevisionLookupRecord extends ArenaRevisionRecord {
  ownerUserId: string | null;
  ownerEmail: string | null;
}

interface BaseBotInput {
  name: string;
  description?: string;
  statsMode?: BotStatsMode;
}

export interface SourceBotInput extends BaseBotInput {
  language: Exclude<SupportedLanguage, "linux-x64-binary">;
  source: string;
}

export interface LinuxBinaryBotInput extends BaseBotInput {
  language: "linux-x64-binary";
  artifactBase64: string;
  artifactFileName: string;
  artifactSha256: string;
  artifactSizeBytes: number;
}

export interface UpdateBinaryBotInput extends BaseBotInput {
  language: "linux-x64-binary";
  artifactBase64?: string;
  artifactFileName?: string;
  artifactSha256?: string;
  artifactSizeBytes?: number;
}

export type CreateBotInput =
  | SourceBotInput
  | LinuxBinaryBotInput;

export type UpdateBotInput =
  | SourceBotInput
  | UpdateBinaryBotInput;

export interface CreateArenaInput {
  name: string;
  description?: string;
  text: string;
}

export interface DeleteResult {
  id: string;
}

export interface CreateMatchInput {
  name: string;
  mode: MatchMode;
  arenaId?: string;
  arenaRevisionId?: string;
  seed: number;
  maxTicks: number;
  participants: Array<{
    botId?: string;
    botRevisionId?: string;
    teamId: TeamId;
  }>;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

interface DatabaseOptions {
  adminEmail?: string;
  adminPassword?: string;
}

type TimestampValue = Date | string;

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type SessionLookupRow = {
  id: string;
  expires_at: TimestampValue;
  user_id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type BotRow = {
  id: string;
  owner_user_id: string | null;
  owner_email: string | null;
  name: string;
  description: string;
  stats_mode: BotStatsMode;
  created_at: TimestampValue;
  updated_at: TimestampValue;
  revision_id: string;
  revision_language: SupportedLanguage;
  revision_source: string;
  revision_artifact_filename: string | null;
  revision_artifact_sha256: string | null;
  revision_artifact_size_bytes: number | null;
  revision_version: number;
  revision_created_at: TimestampValue;
};

type BotStatsRow = {
  id: string;
  bot_id: string;
  bot_revision_id: string | null;
  scope: BotStatsScope;
  revision_version: number | null;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  shots_fired: number;
  shots_landed: number;
  direct_hits: number;
  scans: number;
  kills: number;
  deaths: number;
  damage_given: number;
  damage_taken: number;
  collisions: number;
  last_match_at: TimestampValue | null;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type ArenaRow = {
  id: string;
  owner_user_id: string | null;
  owner_email: string | null;
  name: string;
  description: string;
  created_at: TimestampValue;
  updated_at: TimestampValue;
  revision_id: string;
  revision_text: string;
  revision_version: number;
  revision_created_at: TimestampValue;
};

type MatchRow = {
  id: string;
  owner_user_id: string | null;
  owner_email: string | null;
  name: string;
  mode: MatchMode;
  status: MatchStatus;
  ladder_id: string | null;
  tournament_id: string | null;
  tournament_round_id: string | null;
  round_slot: number | null;
  arena_revision_id: string;
  arena_id: string;
  arena_name: string;
  arena_text: string;
  seed: number;
  max_ticks: number;
  error_message: string | null;
  result_json: unknown;
  events_json: unknown;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type MatchParticipantRow = {
  id: string;
  match_id: string;
  bot_revision_id: string;
  bot_id: string;
  bot_name: string;
  language: SupportedLanguage;
  source: string;
  artifact_base64: string | null;
  artifact_filename: string | null;
  artifact_sha256: string | null;
  artifact_size_bytes: number | null;
  revision_version: number;
  team_id: TeamId;
  slot: number;
};

type BotRevisionLookupRow = {
  id: string;
  bot_id: string;
  language: SupportedLanguage;
  source: string;
  artifact_filename: string | null;
  artifact_sha256: string | null;
  artifact_size_bytes: number | null;
  version: number;
  created_at: TimestampValue;
  owner_user_id: string | null;
  owner_email: string | null;
};

type ArenaRevisionLookupRow = {
  id: string;
  arena_id: string;
  text: string;
  version: number;
  created_at: TimestampValue;
  owner_user_id: string | null;
  owner_email: string | null;
};


function toIso(value: TimestampValue): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23503"
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

function toJsonParameter(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
}

function isBinaryLanguage(language: SupportedLanguage): language is "linux-x64-binary" {
  return language === "linux-x64-binary";
}

function hasBinaryArtifact(input: CreateBotInput | UpdateBotInput): input is LinuxBinaryBotInput | UpdateBinaryBotInput {
  return isBinaryLanguage(input.language);
}

function normalizeBotStatsMode(mode?: BotStatsMode): BotStatsMode {
  return mode ?? "per-bot";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const MAX_PASSWORD_LENGTH = 1024;

function validatePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (!hasLetter || !hasNumber) {
    throw new Error("Password must include at least one letter and one number");
  }
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, expectedHex] = passwordHash.split(":");
  if (!salt || !expectedHex) {
    console.warn("verifyPassword: malformed password hash in database (expected salt:hex format)");
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionExpiry(ttlDays = DEFAULT_SESSION_TTL_DAYS): Date {
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

function mapUserRow(row: Pick<UserRow, "id" | "email" | "role" | "is_active" | "created_at" | "updated_at">): UserRecord {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapBotStatsRow(row: BotStatsRow): BotStatsBucketRecord {
  return {
    id: row.id,
    botId: row.bot_id,
    botRevisionId: row.bot_revision_id,
    scope: row.scope,
    revisionVersion: row.revision_version,
    label: row.scope === "bot" ? "All variants" : `v${row.revision_version ?? "?"}`,
    matches: row.matches,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    shotsFired: row.shots_fired,
    shotsLanded: row.shots_landed,
    directHits: row.direct_hits,
    scans: row.scans,
    kills: row.kills,
    deaths: row.deaths,
    damageGiven: row.damage_given,
    damageTaken: row.damage_taken,
    collisions: row.collisions,
    winRatePct: calculateRate(row.wins, row.matches),
    hitRatePct: calculateRate(row.shots_landed, row.shots_fired),
    survivalRatePct: calculateRate(row.matches - row.deaths, row.matches),
    lastMatchAt: row.last_match_at ? toIso(row.last_match_at) : null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function createZeroBotStatsBucket(bot: {
  id: string;
  latestRevision: BotRevisionRecord;
  statsMode: BotStatsMode;
  updatedAt: string;
}): BotStatsBucketRecord {
  const scope: BotStatsScope = bot.statsMode === "per-bot" ? "bot" : "revision";
  return {
    id: `pending:${bot.id}:${scope === "bot" ? "bot" : bot.latestRevision.id}`,
    botId: bot.id,
    botRevisionId: scope === "bot" ? null : bot.latestRevision.id,
    scope,
    revisionVersion: scope === "bot" ? null : bot.latestRevision.version,
    label: scope === "bot" ? "All variants" : `v${bot.latestRevision.version}`,
    ...createEmptyBotStatsCounters(),
    winRatePct: 0,
    hitRatePct: 0,
    survivalRatePct: 0,
    lastMatchAt: null,
    createdAt: bot.latestRevision.createdAt,
    updatedAt: bot.updatedAt
  };
}

function mapBotRow(row: BotRow, statsRows: BotStatsRow[]): BotRecord {
  const latestRevision: BotRevisionRecord = {
    id: row.revision_id,
    botId: row.id,
    language: row.revision_language,
    source: row.revision_source,
    artifactFileName: row.revision_artifact_filename,
    artifactSha256: row.revision_artifact_sha256,
    artifactSizeBytes: row.revision_artifact_size_bytes,
    version: row.revision_version,
    createdAt: toIso(row.revision_created_at)
  };
  const mappedStats = statsRows
    .map(mapBotStatsRow)
    .sort((left, right) => {
      if (left.scope !== right.scope) {
        return left.scope === "bot" ? -1 : 1;
      }

      return (right.revisionVersion ?? 0) - (left.revisionVersion ?? 0);
    });

  const baseBot = {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerEmail: row.owner_email,
    name: row.name,
    description: row.description,
    statsMode: row.stats_mode,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    latestRevision
  };
  const activeStats =
    (row.stats_mode === "per-bot"
      ? mappedStats.find((entry) => entry.scope === "bot")
      : mappedStats.find((entry) => entry.botRevisionId === latestRevision.id)) ?? createZeroBotStatsBucket(baseBot);

  const statsBuckets =
    row.stats_mode === "per-bot"
      ? [activeStats]
      : mappedStats.length > 0 && mappedStats.some((entry) => entry.botRevisionId === latestRevision.id)
        ? mappedStats
        : [activeStats, ...mappedStats];

  return {
    ...baseBot,
    latestRevision,
    statsBuckets,
    activeStats
  };
}

function mapArenaRow(row: ArenaRow): ArenaRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerEmail: row.owner_email,
    name: row.name,
    description: row.description,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    latestRevision: {
      id: row.revision_id,
      arenaId: row.id,
      text: row.revision_text,
      version: row.revision_version,
      createdAt: toIso(row.revision_created_at)
    }
  };
}

function mapParticipantRow(row: MatchParticipantRow): MatchParticipantRecord {
  return {
    id: row.id,
    matchId: row.match_id,
    botRevisionId: row.bot_revision_id,
    botId: row.bot_id,
    botName: row.bot_name,
    language: row.language,
    source: row.source,
    artifactBase64: row.artifact_base64,
    artifactFileName: row.artifact_filename,
    artifactSha256: row.artifact_sha256,
    artifactSizeBytes: row.artifact_size_bytes,
    revisionVersion: row.revision_version,
    teamId: row.team_id,
    slot: row.slot
  };
}

function mapMatchRow(row: MatchRow, participants: MatchParticipantRow[]): MatchRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerEmail: row.owner_email,
    name: row.name,
    mode: row.mode,
    status: row.status,
    ladderId: row.ladder_id,
    tournamentId: row.tournament_id,
    tournamentRoundId: row.tournament_round_id,
    roundSlot: row.round_slot,
    arenaRevisionId: row.arena_revision_id,
    arenaId: row.arena_id,
    arenaName: row.arena_name,
    arenaText: row.arena_text,
    seed: row.seed,
    maxTicks: row.max_ticks,
    errorMessage: row.error_message,
    result: row.result_json,
    events: row.events_json,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    participants: participants.map(mapParticipantRow)
  };
}

function mapBotRevisionLookupRow(row: BotRevisionLookupRow): BotRevisionLookupRecord {
  return {
    id: row.id,
    botId: row.bot_id,
    language: row.language,
    source: row.source,
    artifactFileName: row.artifact_filename,
    artifactSha256: row.artifact_sha256,
    artifactSizeBytes: row.artifact_size_bytes,
    version: row.version,
    createdAt: toIso(row.created_at),
    ownerUserId: row.owner_user_id,
    ownerEmail: row.owner_email
  };
}

function mapArenaRevisionLookupRow(row: ArenaRevisionLookupRow): ArenaRevisionLookupRecord {
  return {
    id: row.id,
    arenaId: row.arena_id,
    text: row.text,
    version: row.version,
    createdAt: toIso(row.created_at),
    ownerUserId: row.owner_user_id,
    ownerEmail: row.owner_email
  };
}

function isAdmin(scope?: AccessScope): boolean {
  return scope?.role === "admin";
}

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

async function loadBotStatsRows(queryable: Queryable, botIds: string[]): Promise<BotStatsRow[]> {
  if (botIds.length === 0) {
    return [];
  }

  const result = await queryable.query<BotStatsRow>(
    `
      SELECT
        bs.id,
        bs.bot_id,
        bs.bot_revision_id,
        bs.scope,
        br.version AS revision_version,
        bs.matches,
        bs.wins,
        bs.losses,
        bs.draws,
        bs.shots_fired,
        bs.shots_landed,
        bs.direct_hits,
        bs.scans,
        bs.kills,
        bs.deaths,
        bs.damage_given,
        bs.damage_taken,
        bs.collisions,
        bs.last_match_at,
        bs.created_at,
        bs.updated_at
      FROM bot_stats AS bs
      LEFT JOIN bot_revisions AS br ON br.id = bs.bot_revision_id
      WHERE bs.bot_id = ANY($1::text[])
      ORDER BY bs.updated_at DESC
    `,
    [botIds]
  );

  return result.rows;
}

async function withTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function insertBotRevision(
  client: PoolClient,
  botId: string,
  version: number,
  input: CreateBotInput | UpdateBotInput
): Promise<void> {
  await client.query(
    `
      INSERT INTO bot_revisions (
        id,
        bot_id,
        language,
        source,
        artifact_base64,
        artifact_filename,
        artifact_sha256,
        artifact_size_bytes,
        version
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      randomUUID(),
      botId,
      input.language,
      "source" in input ? input.source : "",
      hasBinaryArtifact(input) ? input.artifactBase64 ?? null : null,
      hasBinaryArtifact(input) ? input.artifactFileName ?? null : null,
      hasBinaryArtifact(input) ? input.artifactSha256 ?? null : null,
      hasBinaryArtifact(input) ? input.artifactSizeBytes ?? null : null,
      version
    ]
  );
}

export class Database {
  readonly pool: Pool;
  private readonly adminEmail: string;
  private readonly adminPassword: string;

  constructor(connectionString: string, options: DatabaseOptions = {}) {
    this.pool = new Pool({ connectionString });
    this.adminEmail = normalizeEmail(options.adminEmail ?? process.env.PCROBOTS_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL);
    this.adminPassword = options.adminPassword ?? process.env.PCROBOTS_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async migrate(): Promise<void> {
    await this.pool.query(bootstrapSql);
    const admin = await this.ensureDefaultAdmin();
    await this.backfillLegacyOwnership(admin.id);
    try {
      await this.pool.query(`DELETE FROM sessions WHERE expires_at <= NOW()`);
    } catch (err) {
      console.warn("failed to clean up expired sessions during migrate — non-fatal", err);
    }
  }

  async listUsers(): Promise<UserRecord[]> {
    const result = await this.pool.query<Omit<UserRow, "password_hash">>(`
      SELECT id, email, role, is_active, created_at, updated_at
      FROM users
      ORDER BY created_at ASC
    `);

    return result.rows.map(mapUserRow);
  }

  async getUser(userId: string): Promise<UserRecord | null> {
    const result = await this.pool.query<Omit<UserRow, "password_hash">>(`
      SELECT id, email, role, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
    `, [userId]);

    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<Omit<UserRow, "password_hash">>(`
      SELECT id, email, role, is_active, created_at, updated_at
      FROM users
      WHERE email = $1
    `, [normalizeEmail(email)]);

    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const userId = randomUUID();
    const normalizedEmail = normalizeEmail(input.email);
    validatePassword(input.password);

    try {
      await this.pool.query(
        `
          INSERT INTO users (id, email, password_hash, role, is_active)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [userId, normalizedEmail, hashPassword(input.password), input.role, input.isActive ?? true]
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error(`User ${normalizedEmail} already exists`);
      }
      throw error;
    }

    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`Failed to reload user ${userId} after insert`);
    }

    return user;
  }

  async updateUser(userId: string, input: UpdateUserInput): Promise<UserRecord> {
    const current = await this.getUserRow(userId);
    if (!current) {
      throw new Error(`User ${userId} was not found`);
    }

    const nextRole = input.role ?? current.role;
    const nextIsActive = input.isActive ?? current.is_active;
    if (input.password) {
      validatePassword(input.password);
    }
    if (current.role === "admin" && current.is_active && (nextRole !== "admin" || !nextIsActive)) {
      const activeAdminCount = await this.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new Error("At least one active admin account must remain");
      }
    }

    try {
      await this.pool.query(
        `
          UPDATE users
          SET
            email = $2,
            password_hash = $3,
            role = $4,
            is_active = $5,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          userId,
          input.email ? normalizeEmail(input.email) : current.email,
          input.password ? hashPassword(input.password) : current.password_hash,
          nextRole,
          nextIsActive
        ]
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error(`User ${input.email ? normalizeEmail(input.email) : current.email} already exists`);
      }
      throw error;
    }

    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`Failed to reload user ${userId} after update`);
    }

    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const current = await this.getUserRow(userId);
    if (!current) {
      return false;
    }

    if (current.role === "admin" && current.is_active) {
      const activeAdminCount = await this.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new Error("At least one active admin account must remain");
      }
    }

    try {
      const result = await this.pool.query<{ id: string }>(`
        DELETE FROM users
        WHERE id = $1
        RETURNING id
      `, [userId]);

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new Error(`User ${current.email} cannot be deleted while owning bots, arenas, matches, ladders, or tournaments`);
      }
      throw error;
    }
  }

  async transferOwnership(fromUserId: string, toUserId: string): Promise<OwnershipTransferResult> {
    if (fromUserId === toUserId) {
      throw new Error("Source and target users must be different");
    }

    const [fromUser, toUser] = await Promise.all([this.getUser(fromUserId), this.getUser(toUserId)]);
    if (!fromUser) {
      throw new Error(`User ${fromUserId} was not found`);
    }
    if (!toUser) {
      throw new Error(`User ${toUserId} was not found`);
    }
    if (!toUser.isActive) {
      throw new Error(`Target user ${toUser.email} is inactive`);
    }

    return withTransaction(this.pool, async (client) => {
      const bots = await client.query(`
        UPDATE bots
        SET owner_user_id = $2, updated_at = NOW()
        WHERE owner_user_id = $1
      `, [fromUserId, toUserId]);

      const arenas = await client.query(`
        UPDATE arenas
        SET owner_user_id = $2, updated_at = NOW()
        WHERE owner_user_id = $1
      `, [fromUserId, toUserId]);

      const ladders = await client.query(`
        UPDATE ladders
        SET owner_user_id = $2, updated_at = NOW()
        WHERE owner_user_id = $1
      `, [fromUserId, toUserId]);

      const tournaments = await client.query(`
        UPDATE tournaments
        SET owner_user_id = $2, updated_at = NOW()
        WHERE owner_user_id = $1
      `, [fromUserId, toUserId]);

      const matches = await client.query(`
        UPDATE matches
        SET owner_user_id = $2, updated_at = NOW()
        WHERE owner_user_id = $1
      `, [fromUserId, toUserId]);

      return {
        fromUserId,
        toUserId,
        bots: bots.rowCount ?? 0,
        arenas: arenas.rowCount ?? 0,
        ladders: ladders.rowCount ?? 0,
        tournaments: tournaments.rowCount ?? 0,
        matches: matches.rowCount ?? 0
      };
    });
  }

  async updateOwnPassword(userId: string, nextPassword: string): Promise<void> {
    validatePassword(nextPassword);
    await this.pool.query(
      `
        UPDATE users
        SET
          password_hash = $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [userId, hashPassword(nextPassword)]
    );
  }

  async authenticateUser(email: string, password: string): Promise<UserRecord | null> {
    const user = await this.getUserRowByEmail(normalizeEmail(email));
    if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
      return null;
    }

    return mapUserRow(user);
  }

  async verifyUserPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.getUserRow(userId);
    return !!user && verifyPassword(password, user.password_hash);
  }

  async createSession(userId: string, ttlDays = DEFAULT_SESSION_TTL_DAYS): Promise<AuthSessionRecord> {
    const user = await this.getUser(userId);
    if (!user || !user.isActive) {
      throw new Error(`User ${userId} is not active`);
    }

    const token = randomBytes(32).toString("hex");
    const sessionId = randomUUID();
    const configuredTtl = Number(process.env.PCROBOTS_SESSION_TTL_DAYS ?? "");
    const effectiveTtl =
      Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : ttlDays;
    const expiresAt = createSessionExpiry(effectiveTtl);

    await this.pool.query(
      `
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [sessionId, userId, hashSessionToken(token), expiresAt.toISOString()]
    );

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user
    };
  }

  async getUserBySessionToken(token: string): Promise<UserRecord | null> {
    const result = await this.pool.query<SessionLookupRow>(`
      SELECT
        s.id,
        s.expires_at,
        u.id AS user_id,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM sessions AS s
      JOIN users AS u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
      LIMIT 1
    `, [hashSessionToken(token)]);

    const row = result.rows[0];
    if (!row || !row.is_active) {
      return null;
    }

    await this.pool.query(
      `
        UPDATE sessions
        SET last_seen_at = NOW()
        WHERE id = $1
      `,
      [row.id]
    );

    return {
      id: row.user_id,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at)
    };
  }

  async deleteSession(token: string): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(`
      DELETE FROM sessions
      WHERE token_hash = $1
      RETURNING id
    `, [hashSessionToken(token)]);

    return (result.rowCount ?? 0) > 0;
  }

  async deleteSessionsForUser(userId: string, exceptToken?: string): Promise<number> {
    const params: unknown[] = [userId];
    let extraClause = "";
    if (exceptToken) {
      params.push(hashSessionToken(exceptToken));
      extraClause = "AND token_hash <> $2";
    }

    const result = await this.pool.query<{ id: string }>(`
      DELETE FROM sessions
      WHERE user_id = $1
      ${extraClause}
      RETURNING id
    `, params);

    return result.rowCount ?? 0;
  }

  async listBots(scope?: AccessScope): Promise<BotRecord[]> {
    const params: unknown[] = [];
    const whereClause = isAdmin(scope) || !scope ? "" : "WHERE b.owner_user_id = $1";
    if (scope && !isAdmin(scope)) {
      params.push(scope.userId);
    }

    const result = await this.pool.query<BotRow>(`
      SELECT
        b.id,
        b.owner_user_id,
        u.email AS owner_email,
        b.name,
        b.description,
        b.stats_mode,
        b.created_at,
        b.updated_at,
        br.id AS revision_id,
        br.language AS revision_language,
        br.source AS revision_source,
        br.artifact_filename AS revision_artifact_filename,
        br.artifact_sha256 AS revision_artifact_sha256,
        br.artifact_size_bytes AS revision_artifact_size_bytes,
        br.version AS revision_version,
        br.created_at AS revision_created_at
      FROM bots AS b
      LEFT JOIN users AS u ON u.id = b.owner_user_id
      JOIN LATERAL (
        SELECT id, language, source, artifact_filename, artifact_sha256, artifact_size_bytes, version, created_at
        FROM bot_revisions
        WHERE bot_id = b.id
        ORDER BY version DESC
        LIMIT 1
      ) AS br ON TRUE
      ${whereClause}
      ORDER BY b.created_at DESC
    `, params);

    const statsRows = await loadBotStatsRows(this.pool, result.rows.map((row) => row.id));
    const statsByBotId = new Map<string, BotStatsRow[]>();
    for (const row of statsRows) {
      const list = statsByBotId.get(row.bot_id) ?? [];
      list.push(row);
      statsByBotId.set(row.bot_id, list);
    }

    return result.rows.map((row) => mapBotRow(row, statsByBotId.get(row.id) ?? []));
  }

  async getBot(botId: string, scope?: AccessScope): Promise<BotRecord | null> {
    const params: unknown[] = [botId];
    let scopeClause = "";
    if (scope && !isAdmin(scope)) {
      params.push(scope.userId);
      scopeClause = "AND b.owner_user_id = $2";
    }

    const result = await this.pool.query<BotRow>(`
      SELECT
        b.id,
        b.owner_user_id,
        u.email AS owner_email,
        b.name,
        b.description,
        b.stats_mode,
        b.created_at,
        b.updated_at,
        br.id AS revision_id,
        br.language AS revision_language,
        br.source AS revision_source,
        br.artifact_filename AS revision_artifact_filename,
        br.artifact_sha256 AS revision_artifact_sha256,
        br.artifact_size_bytes AS revision_artifact_size_bytes,
        br.version AS revision_version,
        br.created_at AS revision_created_at
      FROM bots AS b
      LEFT JOIN users AS u ON u.id = b.owner_user_id
      JOIN LATERAL (
        SELECT id, language, source, artifact_filename, artifact_sha256, artifact_size_bytes, version, created_at
        FROM bot_revisions
        WHERE bot_id = b.id
        ORDER BY version DESC
        LIMIT 1
      ) AS br ON TRUE
      WHERE b.id = $1
      ${scopeClause}
    `, params);

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const statsRows = await loadBotStatsRows(this.pool, [row.id]);
    return mapBotRow(row, statsRows);
  }

  async getBotRevision(revisionId: string, scope?: AccessScope): Promise<BotRevisionLookupRecord | null> {
    const params: unknown[] = [revisionId];
    let scopeClause = "";
    if (scope && !isAdmin(scope)) {
      params.push(scope.userId);
      scopeClause = "AND b.owner_user_id = $2";
    }

    const result = await this.pool.query<BotRevisionLookupRow>(`
      SELECT
        br.id,
        br.bot_id,
        br.language,
        br.source,
        br.artifact_filename,
        br.artifact_sha256,
        br.artifact_size_bytes,
        br.version,
        br.created_at,
        b.owner_user_id,
        u.email AS owner_email
      FROM bot_revisions AS br
      JOIN bots AS b ON b.id = br.bot_id
      LEFT JOIN users AS u ON u.id = b.owner_user_id
      WHERE br.id = $1
      ${scopeClause}
    `, params);

    const row = result.rows[0];
    return row ? mapBotRevisionLookupRow(row) : null;
  }

  async createBot(input: CreateBotInput, ownerUserId: string): Promise<BotRecord> {
    const botId = await withTransaction(this.pool, async (client) => {
      const createdBotId = randomUUID();

      await client.query(
        `
          INSERT INTO bots (id, owner_user_id, name, description, stats_mode)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [createdBotId, ownerUserId, input.name, input.description ?? "", normalizeBotStatsMode(input.statsMode)]
      );

      await insertBotRevision(client, createdBotId, 1, input);

      return createdBotId;
    });

    const bot = await this.getBot(botId);
    if (!bot) {
      throw new Error(`Failed to reload bot ${botId} after insert`);
    }

    return bot;
  }

  async updateBot(botId: string, input: UpdateBotInput): Promise<BotRecord> {
    await withTransaction(this.pool, async (client) => {
      const currentBotResult = await client.query<{ id: string; stats_mode: BotStatsMode }>(
        `
          SELECT id, stats_mode
          FROM bots
          WHERE id = $1
        `,
        [botId]
      );
      const currentBot = currentBotResult.rows[0];
      if (!currentBot) {
        throw new Error(`Bot ${botId} was not found`);
      }

      const nextStatsMode = normalizeBotStatsMode(input.statsMode ?? currentBot.stats_mode);
      const updateResult = await client.query<{ id: string }>(
        `
          UPDATE bots
          SET
            name = $2,
            description = $3,
            stats_mode = $4,
            updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `,
        [botId, input.name, input.description ?? "", nextStatsMode]
      );

      if ((updateResult.rowCount ?? 0) === 0) {
        throw new Error(`Bot ${botId} was not found`);
      }

      // For binary bots with no new artifact, metadata update above is sufficient — skip new revision.
      const isMetadataOnlyBinaryUpdate =
        isBinaryLanguage(input.language) && !("artifactBase64" in input && input.artifactBase64);

      if (!isMetadataOnlyBinaryUpdate) {
        const versionResult = await client.query<{ next_version: number }>(
          `
            SELECT COALESCE(MAX(version), 0) + 1 AS next_version
            FROM bot_revisions
            WHERE bot_id = $1
          `,
          [botId]
        );

        await insertBotRevision(client, botId, versionResult.rows[0].next_version, input);
      }

      const statsModeChanged = nextStatsMode !== currentBot.stats_mode;
      const shouldResetForNewVariant = nextStatsMode === "reset-on-variant" && !isMetadataOnlyBinaryUpdate;
      if (statsModeChanged || shouldResetForNewVariant) {
        await client.query(`DELETE FROM bot_stats WHERE bot_id = $1`, [botId]);
      }
    });

    const bot = await this.getBot(botId);
    if (!bot) {
      throw new Error(`Failed to reload bot ${botId} after update`);
    }

    return bot;
  }

  async deleteBot(botId: string): Promise<boolean> {
    try {
      const result = await this.pool.query<{ id: string }>(
        `
          DELETE FROM bots
          WHERE id = $1
          RETURNING id
        `,
        [botId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new Error(`Bot ${botId} cannot be deleted while referenced by matches, ladders, or tournaments`);
      }

      throw error;
    }
  }

  async listArenas(scope?: AccessScope): Promise<ArenaRecord[]> {
    const params: unknown[] = [];
    const whereClause = isAdmin(scope) || !scope ? "" : "WHERE a.owner_user_id = $1";
    if (scope && !isAdmin(scope)) {
      params.push(scope.userId);
    }

    const result = await this.pool.query<ArenaRow>(`
      SELECT
        a.id,
        a.owner_user_id,
        u.email AS owner_email,
        a.name,
        a.description,
        a.created_at,
        a.updated_at,
        ar.id AS revision_id,
        ar.text AS revision_text,
        ar.version AS revision_version,
        ar.created_at AS revision_created_at
      FROM arenas AS a
      LEFT JOIN users AS u ON u.id = a.owner_user_id
      JOIN LATERAL (
        SELECT id, text, version, created_at
        FROM arena_revisions
        WHERE arena_id = a.id
        ORDER BY version DESC
        LIMIT 1
      ) AS ar ON TRUE
      ${whereClause}
      ORDER BY a.created_at DESC
    `, params);

    return result.rows.map(mapArenaRow);
  }

  async getArena(arenaId: string, scope?: AccessScope): Promise<ArenaRecord | null> {
    const params: unknown[] = [arenaId];
    let scopeClause = "";
    if (scope && !isAdmin(scope)) {
      params.push(scope.userId);
      scopeClause = "AND a.owner_user_id = $2";
    }

    const result = await this.pool.query<ArenaRow>(`
      SELECT
        a.id,
        a.owner_user_id,
        u.email AS owner_email,
        a.name,
        a.description,
        a.created_at,
        a.updated_at,
        ar.id AS revision_id,
        ar.text AS revision_text,
        ar.version AS revision_version,
        ar.created_at AS revision_created_at
      FROM arenas AS a
      LEFT JOIN users AS u ON u.id = a.owner_user_id
      JOIN LATERAL (
        SELECT id, text, version, created_at
        FROM arena_revisions
        WHERE arena_id = a.id
        ORDER BY version DESC
        LIMIT 1
      ) AS ar ON TRUE
      WHERE a.id = $1
      ${scopeClause}
    `, params);

    const row = result.rows[0];
    return row ? mapArenaRow(row) : null;
  }

  async getArenaRevision(revisionId: string, scope?: AccessScope): Promise<ArenaRevisionLookupRecord | null> {
    const params: unknown[] = [revisionId];
    let scopeClause = "";
    if (scope && !isAdmin(scope)) {
      params.push(scope.userId);
      scopeClause = "AND a.owner_user_id = $2";
    }

    const result = await this.pool.query<ArenaRevisionLookupRow>(`
      SELECT
        ar.id,
        ar.arena_id,
        ar.text,
        ar.version,
        ar.created_at,
        a.owner_user_id,
        u.email AS owner_email
      FROM arena_revisions AS ar
      JOIN arenas AS a ON a.id = ar.arena_id
      LEFT JOIN users AS u ON u.id = a.owner_user_id
      WHERE ar.id = $1
      ${scopeClause}
    `, params);

    const row = result.rows[0];
    return row ? mapArenaRevisionLookupRow(row) : null;
  }

  async createArena(input: CreateArenaInput, ownerUserId: string): Promise<ArenaRecord> {
    const arenaId = await withTransaction(this.pool, async (client) => {
      const createdArenaId = randomUUID();
      const revisionId = randomUUID();

      await client.query(
        `
          INSERT INTO arenas (id, owner_user_id, name, description)
          VALUES ($1, $2, $3, $4)
        `,
        [createdArenaId, ownerUserId, input.name, input.description ?? ""]
      );

      await client.query(
        `
          INSERT INTO arena_revisions (id, arena_id, text, version)
          VALUES ($1, $2, $3, 1)
        `,
        [revisionId, createdArenaId, input.text]
      );

      return createdArenaId;
    });

    const arena = await this.getArena(arenaId);
    if (!arena) {
      throw new Error(`Failed to reload arena ${arenaId} after insert`);
    }

    return arena;
  }

  async updateArena(arenaId: string, input: CreateArenaInput): Promise<ArenaRecord> {
    await withTransaction(this.pool, async (client) => {
      const updateResult = await client.query<{ id: string }>(
        `
          UPDATE arenas
          SET
            name = $2,
            description = $3,
            updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `,
        [arenaId, input.name, input.description ?? ""]
      );

      if ((updateResult.rowCount ?? 0) === 0) {
        throw new Error(`Arena ${arenaId} was not found`);
      }

      const versionResult = await client.query<{ next_version: number }>(
        `
          SELECT COALESCE(MAX(version), 0) + 1 AS next_version
          FROM arena_revisions
          WHERE arena_id = $1
        `,
        [arenaId]
      );

      await client.query(
        `
          INSERT INTO arena_revisions (id, arena_id, text, version)
          VALUES ($1, $2, $3, $4)
        `,
        [randomUUID(), arenaId, input.text, versionResult.rows[0].next_version]
      );
    });

    const arena = await this.getArena(arenaId);
    if (!arena) {
      throw new Error(`Failed to reload arena ${arenaId} after update`);
    }

    return arena;
  }

  async deleteArena(arenaId: string): Promise<boolean> {
    try {
      const result = await this.pool.query<{ id: string }>(
        `
          DELETE FROM arenas
          WHERE id = $1
          RETURNING id
        `,
        [arenaId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new Error(`Arena ${arenaId} cannot be deleted while referenced by matches, ladders, or tournaments`);
      }

      throw error;
    }
  }

  async listMatches(scope?: AccessScope): Promise<MatchRecord[]> {
    const params: unknown[] = [];
    const whereClause = isAdmin(scope) || !scope ? "" : "WHERE m.owner_user_id = $1";
    if (scope && !isAdmin(scope)) {
      params.push(scope.userId);
    }

    const matchResult = await this.pool.query<MatchRow>(`
      SELECT
        m.id,
        m.owner_user_id,
        u.email AS owner_email,
        m.name,
        m.mode,
        m.status,
        m.ladder_id,
        m.tournament_id,
        m.tournament_round_id,
        m.round_slot,
        m.arena_revision_id,
        a.id AS arena_id,
        a.name AS arena_name,
        ar.text AS arena_text,
        m.seed,
        m.max_ticks,
        m.error_message,
        m.result_json,
        m.events_json,
        m.created_at,
        m.updated_at
      FROM matches AS m
      LEFT JOIN users AS u ON u.id = m.owner_user_id
      JOIN arena_revisions AS ar ON ar.id = m.arena_revision_id
      JOIN arenas AS a ON a.id = ar.arena_id
      ${whereClause}
      ORDER BY m.created_at DESC
    `, params);

    if (matchResult.rows.length === 0) {
      return [];
    }

    const participantResult = await this.pool.query<MatchParticipantRow>(`
      SELECT
        mp.id,
        mp.match_id,
        mp.bot_revision_id,
        br.bot_id,
        b.name AS bot_name,
        br.language,
        br.source,
        br.artifact_base64,
        br.artifact_filename,
        br.artifact_sha256,
        br.artifact_size_bytes,
        br.version AS revision_version,
        mp.team_id,
        mp.slot
      FROM match_participants AS mp
      JOIN bot_revisions AS br ON br.id = mp.bot_revision_id
      JOIN bots AS b ON b.id = br.bot_id
      WHERE mp.match_id = ANY($1::text[])
      ORDER BY mp.slot ASC
    `, [matchResult.rows.map((row) => row.id)]);

    const participantsByMatch = new Map<string, MatchParticipantRow[]>();
    for (const row of participantResult.rows) {
      const list = participantsByMatch.get(row.match_id) ?? [];
      list.push(row);
      participantsByMatch.set(row.match_id, list);
    }

    return matchResult.rows.map((row) => mapMatchRow(row, participantsByMatch.get(row.id) ?? []));
  }

  async getMatch(matchId: string, scope?: AccessScope): Promise<MatchRecord | null> {
    const params: unknown[] = [matchId];
    let scopeClause = "";
    if (scope && !isAdmin(scope)) {
      params.push(scope.userId);
      scopeClause = "AND m.owner_user_id = $2";
    }

    const matchResult = await this.pool.query<MatchRow>(`
      SELECT
        m.id,
        m.owner_user_id,
        u.email AS owner_email,
        m.name,
        m.mode,
        m.status,
        m.ladder_id,
        m.tournament_id,
        m.tournament_round_id,
        m.round_slot,
        m.arena_revision_id,
        a.id AS arena_id,
        a.name AS arena_name,
        ar.text AS arena_text,
        m.seed,
        m.max_ticks,
        m.error_message,
        m.result_json,
        m.events_json,
        m.created_at,
        m.updated_at
      FROM matches AS m
      LEFT JOIN users AS u ON u.id = m.owner_user_id
      JOIN arena_revisions AS ar ON ar.id = m.arena_revision_id
      JOIN arenas AS a ON a.id = ar.arena_id
      WHERE m.id = $1
      ${scopeClause}
    `, params);

    const matchRow = matchResult.rows[0];
    if (!matchRow) {
      return null;
    }

    const participantResult = await this.pool.query<MatchParticipantRow>(`
      SELECT
        mp.id,
        mp.match_id,
        mp.bot_revision_id,
        br.bot_id,
        b.name AS bot_name,
        br.language,
        br.source,
        br.artifact_base64,
        br.artifact_filename,
        br.artifact_sha256,
        br.artifact_size_bytes,
        br.version AS revision_version,
        mp.team_id,
        mp.slot
      FROM match_participants AS mp
      JOIN bot_revisions AS br ON br.id = mp.bot_revision_id
      JOIN bots AS b ON b.id = br.bot_id
      WHERE mp.match_id = $1
      ORDER BY mp.slot ASC
    `, [matchId]);

    return mapMatchRow(matchRow, participantResult.rows);
  }

  async createMatch(input: CreateMatchInput, ownerUserId: string): Promise<MatchRecord> {
    const matchId = await withTransaction(this.pool, async (client) => {
      const createdMatchId = randomUUID();
      const arenaRevisionId = input.arenaRevisionId ?? (await this.resolveLatestArenaRevisionId(client, input.arenaId));
      const initialStatus: MatchStatus = "pending";

      await client.query(
        `
          INSERT INTO matches (id, owner_user_id, name, mode, status, arena_revision_id, seed, max_ticks)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [createdMatchId, ownerUserId, input.name, input.mode, initialStatus, arenaRevisionId, input.seed, input.maxTicks]
      );

      for (const [index, participant] of input.participants.entries()) {
        const participantId = randomUUID();
        const botRevisionId = participant.botRevisionId ?? (await this.resolveLatestBotRevisionId(client, participant.botId));

        await client.query(
          `
            INSERT INTO match_participants (id, match_id, bot_revision_id, team_id, slot)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [participantId, createdMatchId, botRevisionId, participant.teamId, index]
        );
      }

      return createdMatchId;
    });

    const match = await this.getMatch(matchId);
    if (!match) {
      throw new Error(`Failed to reload match ${matchId} after insert`);
    }

    return match;
  }

  async transitionMatchStatus(matchId: string, fromStatuses: MatchStatus[], toStatus: MatchStatus): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
        UPDATE matches
        SET
          status = $3,
          updated_at = NOW()
        WHERE id = $1
          AND status = ANY($2::text[])
        RETURNING id
      `,
      [matchId, fromStatuses, toStatus]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async startMatchRun(matchId: string): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
        UPDATE matches
        SET
          status = 'running',
          result_json = NULL,
          events_json = NULL,
          error_message = NULL,
          updated_at = NOW()
        WHERE id = $1
          AND status = ANY($2::text[])
        RETURNING id
      `,
      [matchId, ["pending", "queued", "failed"] satisfies MatchStatus[]]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async updateRunningMatchRun(
    matchId: string,
    status: Extract<MatchStatus, "completed" | "failed">,
    payload: { result?: unknown; events?: unknown; errorMessage?: string | null }
  ): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
        UPDATE matches
        SET
          status = $2,
          result_json = $3,
          events_json = $4,
          error_message = $5,
          updated_at = NOW()
        WHERE id = $1
          AND status = 'running'
        RETURNING id
      `,
      [
        matchId,
        status,
        toJsonParameter(payload.result),
        toJsonParameter(payload.events),
        payload.errorMessage ?? null
      ]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async completeRunningMatchRun(
    matchId: string,
    payload: { result?: unknown; events?: unknown; errorMessage?: string | null },
    afterComplete?: (client: PoolClient) => Promise<void>
  ): Promise<boolean> {
    return withTransaction(this.pool, async (client) => {
      const result = await client.query<{ id: string }>(
        `
          UPDATE matches
          SET
            status = 'completed',
            result_json = $2,
            events_json = $3,
            error_message = $4,
            updated_at = NOW()
          WHERE id = $1
            AND status = 'running'
          RETURNING id
        `,
        [
          matchId,
          toJsonParameter(payload.result),
          toJsonParameter(payload.events),
          payload.errorMessage ?? null
        ]
      );

      if ((result.rowCount ?? 0) === 0) {
        return false;
      }

      await this.updateBotStatsForCompletedMatch(client, matchId, payload.result, payload.events);

      if (afterComplete) {
        await afterComplete(client);
      }

      return true;
    });
  }

  private async updateBotStatsForCompletedMatch(
    client: PoolClient,
    matchId: string,
    result: unknown,
    events: unknown
  ): Promise<void> {
    const participantResult = await client.query<{
      participant_id: string;
      bot_id: string;
      bot_revision_id: string;
      revision_version: number;
      team_id: TeamId;
      stats_mode: BotStatsMode;
    }>(
      `
        SELECT
          mp.id AS participant_id,
          br.bot_id,
          mp.bot_revision_id,
          br.version AS revision_version,
          mp.team_id,
          b.stats_mode
        FROM match_participants AS mp
        JOIN bot_revisions AS br ON br.id = mp.bot_revision_id
        JOIN bots AS b ON b.id = br.bot_id
        WHERE mp.match_id = $1
        ORDER BY mp.slot ASC
      `,
      [matchId]
    );

    if (participantResult.rows.length === 0) {
      return;
    }

    const deltas = summarizeCompletedMatchStats({
      participants: participantResult.rows.map((row) => ({
        id: row.participant_id,
        botId: row.bot_id,
        botRevisionId: row.bot_revision_id,
        revisionVersion: row.revision_version,
        teamId: row.team_id
      })),
      result: (result as MatchResult | null) ?? null,
      events: Array.isArray(events) ? (events as MatchEvent[]) : []
    });

    const statsModeByBotId = new Map(participantResult.rows.map((row) => [row.bot_id, row.stats_mode]));

    for (const delta of deltas) {
      const statsMode = statsModeByBotId.get(delta.botId) ?? "per-bot";
      const scope: BotStatsScope = statsMode === "per-bot" ? "bot" : "revision";
      const scopeKey = scope === "bot" ? "bot" : delta.botRevisionId;

      await client.query(
        `
          INSERT INTO bot_stats (
            id,
            bot_id,
            bot_revision_id,
            scope,
            scope_key,
            matches,
            wins,
            losses,
            draws,
            shots_fired,
            shots_landed,
            direct_hits,
            scans,
            kills,
            deaths,
            damage_given,
            damage_taken,
            collisions,
            last_match_at
          )
          VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
          )
          ON CONFLICT (bot_id, scope_key)
          DO UPDATE SET
            bot_revision_id = EXCLUDED.bot_revision_id,
            scope = EXCLUDED.scope,
            matches = bot_stats.matches + EXCLUDED.matches,
            wins = bot_stats.wins + EXCLUDED.wins,
            losses = bot_stats.losses + EXCLUDED.losses,
            draws = bot_stats.draws + EXCLUDED.draws,
            shots_fired = bot_stats.shots_fired + EXCLUDED.shots_fired,
            shots_landed = bot_stats.shots_landed + EXCLUDED.shots_landed,
            direct_hits = bot_stats.direct_hits + EXCLUDED.direct_hits,
            scans = bot_stats.scans + EXCLUDED.scans,
            kills = bot_stats.kills + EXCLUDED.kills,
            deaths = bot_stats.deaths + EXCLUDED.deaths,
            damage_given = bot_stats.damage_given + EXCLUDED.damage_given,
            damage_taken = bot_stats.damage_taken + EXCLUDED.damage_taken,
            collisions = bot_stats.collisions + EXCLUDED.collisions,
            last_match_at = NOW(),
            updated_at = NOW()
        `,
        [
          randomUUID(),
          delta.botId,
          scope === "bot" ? null : delta.botRevisionId,
          scope,
          scopeKey,
          delta.matches,
          delta.wins,
          delta.losses,
          delta.draws,
          delta.shotsFired,
          delta.shotsLanded,
          delta.directHits,
          delta.scans,
          delta.kills,
          delta.deaths,
          delta.damageGiven,
          delta.damageTaken,
          delta.collisions
        ]
      );
    }
  }

  private async ensureDefaultAdmin(): Promise<UserRecord> {
    const existing = await this.getUserRowByEmail(this.adminEmail);
    if (existing) {
      if (existing.role !== "admin" || !existing.is_active) {
        await this.pool.query(
          `
            UPDATE users
            SET
              role = 'admin',
              is_active = TRUE,
              updated_at = NOW()
            WHERE id = $1
          `,
          [existing.id]
        );
      }

      const admin = await this.getUser(existing.id);
      if (!admin) {
        throw new Error(`Failed to reload seeded admin ${existing.id}`);
      }
      return admin;
    }

    const admin = await this.createUser({
      email: this.adminEmail,
      password: this.adminPassword,
      role: "admin",
      isActive: true
    });

    if (this.adminPassword === DEFAULT_ADMIN_PASSWORD) {
      console.warn(`Seeded default admin account ${this.adminEmail} with the default password. Change it immediately.`);
    }

    return admin;
  }

  private async backfillLegacyOwnership(adminUserId: string): Promise<void> {
    for (const tableName of ["bots", "arenas", "ladders", "tournaments", "matches"] as const) {
      await this.pool.query(
        `UPDATE ${tableName} SET owner_user_id = $1 WHERE owner_user_id IS NULL`,
        [adminUserId]
      );
    }
  }

  private async getUserRow(userId: string): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>(`
      SELECT id, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
    `, [userId]);

    return result.rows[0] ?? null;
  }

  private async getUserRowByEmail(email: string): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>(`
      SELECT id, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE email = $1
    `, [email]);

    return result.rows[0] ?? null;
  }

  private async countActiveAdmins(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM users
      WHERE role = 'admin'
        AND is_active = TRUE
    `);

    return Number(result.rows[0]?.count ?? 0);
  }

  private async resolveLatestArenaRevisionId(client: PoolClient, arenaId: string | undefined): Promise<string> {
    if (!arenaId) {
      throw new Error("arenaId or arenaRevisionId is required");
    }

    const result = await client.query<{ id: string }>(`
      SELECT id
      FROM arena_revisions
      WHERE arena_id = $1
      ORDER BY version DESC
      LIMIT 1
    `, [arenaId]);

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Arena ${arenaId} was not found`);
    }

    return row.id;
  }

  private async resolveLatestBotRevisionId(client: PoolClient, botId: string | undefined): Promise<string> {
    if (!botId) {
      throw new Error("botId or botRevisionId is required for each participant");
    }

    const result = await client.query<{ id: string }>(`
      SELECT id
      FROM bot_revisions
      WHERE bot_id = $1
      ORDER BY version DESC
      LIMIT 1
    `, [botId]);

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Bot ${botId} was not found`);
    }

    return row.id;
  }
}
