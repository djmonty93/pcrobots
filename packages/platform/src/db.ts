import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

import { bootstrapSql } from "./schema.js";

export type SupportedLanguage = "javascript" | "typescript" | "python";
export type TeamId = "A" | "B" | "C";
export type MatchMode =
  | "live"
  | "queued"
  | "ladder"
  | "round-robin"
  | "single-elimination"
  | "double-elimination";
export type MatchStatus = "pending" | "queued" | "running" | "completed" | "failed";

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
  name: string;
  mode: MatchMode;
  status: MatchStatus;
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

type TimestampValue = Date | string;

type BotRow = {
  id: string;
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
  name: string;
  mode: MatchMode;
  status: MatchStatus;
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

function toIso(value: TimestampValue): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toJsonParameter(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
}

function mapBotRow(row: BotRow): BotRecord {
  return {
    id: row.id,
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
    name: row.name,
    mode: row.mode,
    status: row.status,
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

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async migrate(): Promise<void> {
    await this.pool.query(bootstrapSql);
  }

  async listBots(): Promise<BotRecord[]> {
    const result = await this.pool.query<BotRow>(`
      SELECT
        b.id,
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
      JOIN LATERAL (
        SELECT id, language, source, version, created_at
        FROM bot_revisions
        WHERE bot_id = b.id
        ORDER BY version DESC
        LIMIT 1
      ) AS br ON TRUE
      ORDER BY b.created_at DESC
    `);

    return result.rows.map(mapBotRow);
  }

  async getBot(botId: string): Promise<BotRecord | null> {
    const result = await this.pool.query<BotRow>(`
      SELECT
        b.id,
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
      JOIN LATERAL (
        SELECT id, language, source, version, created_at
        FROM bot_revisions
        WHERE bot_id = b.id
        ORDER BY version DESC
        LIMIT 1
      ) AS br ON TRUE
      WHERE b.id = $1
    `, [botId]);

    const row = result.rows[0];
    return row ? mapBotRow(row) : null;
  }

  async createBot(input: CreateBotInput): Promise<BotRecord> {
    const botId = await withTransaction(this.pool, async (client) => {
      const createdBotId = randomUUID();
      const revisionId = randomUUID();

      await client.query(
        `
          INSERT INTO bots (id, name, description)
          VALUES ($1, $2, $3)
        `,
        [createdBotId, input.name, input.description ?? ""]
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

  async listArenas(): Promise<ArenaRecord[]> {
    const result = await this.pool.query<ArenaRow>(`
      SELECT
        a.id,
        a.name,
        a.description,
        a.created_at,
        a.updated_at,
        ar.id AS revision_id,
        ar.text AS revision_text,
        ar.version AS revision_version,
        ar.created_at AS revision_created_at
      FROM arenas AS a
      JOIN LATERAL (
        SELECT id, text, version, created_at
        FROM arena_revisions
        WHERE arena_id = a.id
        ORDER BY version DESC
        LIMIT 1
      ) AS ar ON TRUE
      ORDER BY a.created_at DESC
    `);

    return result.rows.map(mapArenaRow);
  }

  async getArena(arenaId: string): Promise<ArenaRecord | null> {
    const result = await this.pool.query<ArenaRow>(`
      SELECT
        a.id,
        a.name,
        a.description,
        a.created_at,
        a.updated_at,
        ar.id AS revision_id,
        ar.text AS revision_text,
        ar.version AS revision_version,
        ar.created_at AS revision_created_at
      FROM arenas AS a
      JOIN LATERAL (
        SELECT id, text, version, created_at
        FROM arena_revisions
        WHERE arena_id = a.id
        ORDER BY version DESC
        LIMIT 1
      ) AS ar ON TRUE
      WHERE a.id = $1
    `, [arenaId]);

    const row = result.rows[0];
    return row ? mapArenaRow(row) : null;
  }

  async createArena(input: CreateArenaInput): Promise<ArenaRecord> {
    const arenaId = await withTransaction(this.pool, async (client) => {
      const createdArenaId = randomUUID();
      const revisionId = randomUUID();

      await client.query(
        `
          INSERT INTO arenas (id, name, description)
          VALUES ($1, $2, $3)
        `,
        [createdArenaId, input.name, input.description ?? ""]
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

  async listMatches(): Promise<MatchRecord[]> {
    const matchResult = await this.pool.query<MatchRow>(`
      SELECT
        m.id,
        m.name,
        m.mode,
        m.status,
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
      JOIN arena_revisions AS ar ON ar.id = m.arena_revision_id
      JOIN arenas AS a ON a.id = ar.arena_id
      ORDER BY m.created_at DESC
    `);

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
    `, [matchResult.rows.map((row: MatchRow) => row.id)]);

    const participantsByMatch = new Map<string, MatchParticipantRow[]>();
    for (const row of participantResult.rows) {
      const list = participantsByMatch.get(row.match_id) ?? [];
      list.push(row);
      participantsByMatch.set(row.match_id, list);
    }

    return matchResult.rows.map((row: MatchRow) => mapMatchRow(row, participantsByMatch.get(row.id) ?? []));
  }

  async getMatch(matchId: string): Promise<MatchRecord | null> {
    const matchResult = await this.pool.query<MatchRow>(`
      SELECT
        m.id,
        m.name,
        m.mode,
        m.status,
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
      JOIN arena_revisions AS ar ON ar.id = m.arena_revision_id
      JOIN arenas AS a ON a.id = ar.arena_id
      WHERE m.id = $1
    `, [matchId]);

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

  async createMatch(input: CreateMatchInput): Promise<MatchRecord> {
    const matchId = await withTransaction(this.pool, async (client) => {
      const createdMatchId = randomUUID();
      const arenaRevisionId = input.arenaRevisionId ?? (await this.resolveLatestArenaRevisionId(client, input.arenaId));
      const initialStatus: MatchStatus = "pending";

      await client.query(
        `
          INSERT INTO matches (id, name, mode, status, arena_revision_id, seed, max_ticks)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [createdMatchId, input.name, input.mode, initialStatus, arenaRevisionId, input.seed, input.maxTicks]
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
      [matchId, ['pending', 'queued', 'failed'] satisfies MatchStatus[]]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async updateRunningMatchRun(
    matchId: string,
    status: Extract<MatchStatus, 'completed' | 'failed'>,
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
