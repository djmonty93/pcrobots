import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool, type PoolClient } from "pg";

import { bootstrapSql } from "./schema.js";

export type SupportedLanguage = "javascript" | "typescript" | "python";
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
const DEFAULT_ADMIN_PASSWORD = "change-me-admin-password";
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
  version: number;
  createdAt: string;
}

export interface BotRecord {
  id: string;
  ownerUserId: string | null;
  ownerEmail: string | null;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  latestRevision: BotRevisionRecord;
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

export interface CreateBotInput {
  name: string;
  description?: string;
  language: SupportedLanguage;
  source: string;
}

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
  created_at: TimestampValue;
  updated_at: TimestampValue;
  revision_id: string;
  revision_language: SupportedLanguage;
  revision_source: string;
  revision_version: number;
  revision_created_at: TimestampValue;
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
  revision_version: number;
  team_id: TeamId;
  slot: number;
};

type BotRevisionLookupRow = {
  id: string;
  bot_id: string;
  language: SupportedLanguage;
  source: string;
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function validatePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
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
    return false;
  }

  const actual = scryptSync(password, salt, expectedHex.length / 2);
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

function mapBotRow(row: BotRow): BotRecord {
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
      botId: row.id,
      language: row.revision_language,
      source: row.revision_source,
      version: row.revision_version,
      createdAt: toIso(row.revision_created_at)
    }
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
  }

  async listUsers(): Promise<UserRecord[]> {
    const result = await this.pool.query<UserRow>(`
      SELECT id, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      ORDER BY created_at ASC
    `);

    return result.rows.map(mapUserRow);
  }

  async getUser(userId: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(`
      SELECT id, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
    `, [userId]);

    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(`
      SELECT id, email, password_hash, role, is_active, created_at, updated_at
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
        b.created_at,
        b.updated_at,
        br.id AS revision_id,
        br.language AS revision_language,
        br.source AS revision_source,
        br.version AS revision_version,
        br.created_at AS revision_created_at
      FROM bots AS b
      LEFT JOIN users AS u ON u.id = b.owner_user_id
      JOIN LATERAL (
        SELECT id, language, source, version, created_at
        FROM bot_revisions
        WHERE bot_id = b.id
        ORDER BY version DESC
        LIMIT 1
      ) AS br ON TRUE
      ${whereClause}
      ORDER BY b.created_at DESC
    `, params);

    return result.rows.map(mapBotRow);
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
        b.created_at,
        b.updated_at,
        br.id AS revision_id,
        br.language AS revision_language,
        br.source AS revision_source,
        br.version AS revision_version,
        br.created_at AS revision_created_at
      FROM bots AS b
      LEFT JOIN users AS u ON u.id = b.owner_user_id
      JOIN LATERAL (
        SELECT id, language, source, version, created_at
        FROM bot_revisions
        WHERE bot_id = b.id
        ORDER BY version DESC
        LIMIT 1
      ) AS br ON TRUE
      WHERE b.id = $1
      ${scopeClause}
    `, params);

    const row = result.rows[0];
    return row ? mapBotRow(row) : null;
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
      const revisionId = randomUUID();

      await client.query(
        `
          INSERT INTO bots (id, owner_user_id, name, description)
          VALUES ($1, $2, $3, $4)
        `,
        [createdBotId, ownerUserId, input.name, input.description ?? ""]
      );

      await client.query(
        `
          INSERT INTO bot_revisions (id, bot_id, language, source, version)
          VALUES ($1, $2, $3, $4, 1)
        `,
        [revisionId, createdBotId, input.language, input.source]
      );

      return createdBotId;
    });

    const bot = await this.getBot(botId);
    if (!bot) {
      throw new Error(`Failed to reload bot ${botId} after insert`);
    }

    return bot;
  }

  async updateBot(botId: string, input: CreateBotInput): Promise<BotRecord> {
    await withTransaction(this.pool, async (client) => {
      const updateResult = await client.query<{ id: string }>(
        `
          UPDATE bots
          SET
            name = $2,
            description = $3,
            updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `,
        [botId, input.name, input.description ?? ""]
      );

      if ((updateResult.rowCount ?? 0) === 0) {
        throw new Error(`Bot ${botId} was not found`);
      }

      const versionResult = await client.query<{ next_version: number }>(
        `
          SELECT COALESCE(MAX(version), 0) + 1 AS next_version
          FROM bot_revisions
          WHERE bot_id = $1
        `,
        [botId]
      );

      await client.query(
        `
          INSERT INTO bot_revisions (id, bot_id, language, source, version)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [randomUUID(), botId, input.language, input.source, versionResult.rows[0].next_version]
      );
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

      if (afterComplete) {
        await afterComplete(client);
      }

      return true;
    });
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
