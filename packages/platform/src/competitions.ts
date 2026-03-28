import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { type AccessScope, type Database, type MatchMode, type MatchParticipantRecord, type MatchRecord, type TeamId } from "./db.js";

export type TournamentFormat = "round-robin" | "single-elimination" | "double-elimination";
export type TournamentBracket = "round-robin" | "winners" | "losers" | "finals";

export interface LadderEntryRecord {
  id: string;
  ladderId: string;
  botRevisionId: string;
  botId: string;
  botName: string;
  language: string;
  revisionVersion: number;
  createdAt: string;
}

export interface LadderStandingRecord {
  ladderEntryId: string;
  botId: string;
  botName: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  matches: number;
}

export interface LadderRecord {
  id: string;
  ownerUserId: string | null;
  ownerEmail: string | null;
  name: string;
  description: string;
  arenaRevisionId: string;
  arenaId: string;
  arenaName: string;
  maxTicks: number;
  createdAt: string;
  updatedAt: string;
  entries: LadderEntryRecord[];
  standings: LadderStandingRecord[];
}

export interface TournamentEntryRecord {
  id: string;
  tournamentId: string;
  botRevisionId: string;
  botId: string;
  botName: string;
  language: string;
  revisionVersion: number;
  seed: number;
  createdAt: string;
}

export interface TournamentStandingRecord {
  tournamentEntryId: string;
  botId: string;
  botName: string;
  seed: number;
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  points: number;
  eliminated: boolean;
}

export interface TournamentSummaryRecord {
  totalMatches: number;
  completedMatches: number;
  pendingMatches: number;
  queuedMatches: number;
  runningMatches: number;
  failedMatches: number;
  leaderBotId: string | null;
  leaderBotName: string | null;
  championBotId: string | null;
  championBotName: string | null;
}

export interface TournamentRoundRecord {
  id: string;
  tournamentId: string;
  bracket: TournamentBracket;
  roundNumber: number;
  label: string;
  createdAt: string;
  matches: MatchRecord[];
}

export interface TournamentRecord {
  id: string;
  ownerUserId: string | null;
  ownerEmail: string | null;
  name: string;
  description: string;
  format: TournamentFormat;
  arenaRevisionId: string;
  arenaId: string;
  arenaName: string;
  maxTicks: number;
  seedBase: number;
  createdAt: string;
  updatedAt: string;
  entries: TournamentEntryRecord[];
  rounds: TournamentRoundRecord[];
  standings: TournamentStandingRecord[];
  summary: TournamentSummaryRecord;
}

export interface CreateLadderInput {
  ownerUserId: string;
  name: string;
  description?: string;
  arenaId?: string;
  arenaRevisionId?: string;
  maxTicks: number;
  entryBotIds: string[];
}

export interface CreateTournamentInput {
  ownerUserId: string;
  name: string;
  description?: string;
  format: TournamentFormat;
  arenaId?: string;
  arenaRevisionId?: string;
  maxTicks: number;
  seedBase: number;
  entryBotIds: string[];
}

export interface CreateLadderChallengeInput {
  ladderId: string;
  entryAId?: string;
  entryBId?: string;
  seed: number;
  maxTicks?: number;
}

export interface TournamentPendingMatchOptions {
  roundId?: string;
  limit?: number;
}

type TimestampValue = Date | string;

type LadderRow = {
  id: string;
  owner_user_id: string | null;
  owner_email: string | null;
  name: string;
  description: string;
  arena_revision_id: string;
  arena_id: string;
  arena_name: string;
  max_ticks: number;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type LadderEntryRow = {
  id: string;
  ladder_id: string;
  bot_revision_id: string;
  bot_id: string;
  bot_name: string;
  language: string;
  revision_version: number;
  created_at: TimestampValue;
};

type LadderMatchRow = {
  id: string;
  ladder_id: string;
  result_json: unknown;
  created_at: TimestampValue;
};

type LadderMatchParticipantRow = {
  id: string;
  match_id: string;
  bot_revision_id: string;
  bot_id: string;
  bot_name: string;
  team_id: TeamId;
};

type TournamentRow = {
  id: string;
  owner_user_id: string | null;
  owner_email: string | null;
  name: string;
  description: string;
  format: TournamentFormat;
  arena_revision_id: string;
  arena_id: string;
  arena_name: string;
  max_ticks: number;
  seed_base: number;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type TournamentEntryRow = {
  id: string;
  tournament_id: string;
  bot_revision_id: string;
  bot_id: string;
  bot_name: string;
  language: string;
  revision_version: number;
  seed: number;
  created_at: TimestampValue;
};

type TournamentRoundRow = {
  id: string;
  tournament_id: string;
  bracket: TournamentBracket;
  round_number: number;
  label: string;
  created_at: TimestampValue;
};

type TournamentMatchLinkRow = {
  id: string;
  tournament_id: string;
  tournament_round_id: string | null;
  round_slot: number | null;
};

type ScheduleEntry = TournamentEntryRecord | null;

type ScheduleRound = {
  bracket: TournamentBracket;
  roundNumber: number;
  label: string;
  pairings: Array<[ScheduleEntry, ScheduleEntry]>;
};

function toIso(value: TimestampValue): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getWinnerFromResult(result: unknown): { winnerRobotId: string | null; winnerTeamId: string | null } {
  if (!isRecord(result)) {
    return { winnerRobotId: null, winnerTeamId: null };
  }

  return {
    winnerRobotId: typeof result.winnerRobotId === "string" ? result.winnerRobotId : null,
    winnerTeamId: typeof result.winnerTeamId === "string" ? result.winnerTeamId : null
  };
}

function getMatchWinnerParticipant(match: MatchRecord): MatchParticipantRecord | null {
  const winner = getWinnerFromResult(match.result);
  return (
    match.participants.find((participant) => participant.id === winner.winnerRobotId) ??
    match.participants.find((participant) => participant.teamId === winner.winnerTeamId) ??
    null
  );
}

function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

function applyElo(left: LadderStandingRecord, right: LadderStandingRecord, leftScore: number, rightScore: number): void {
  const k = 32;
  const leftExpected = expectedScore(left.rating, right.rating);
  const rightExpected = expectedScore(right.rating, left.rating);

  left.rating = Math.round(left.rating + k * (leftScore - leftExpected));
  right.rating = Math.round(right.rating + k * (rightScore - rightExpected));
}

function nextPowerOfTwo(value: number): number {
  let power = 1;
  while (power < value) {
    power <<= 1;
  }
  return power;
}

function mapLadderEntryRow(row: LadderEntryRow): LadderEntryRecord {
  return {
    id: row.id,
    ladderId: row.ladder_id,
    botRevisionId: row.bot_revision_id,
    botId: row.bot_id,
    botName: row.bot_name,
    language: row.language,
    revisionVersion: row.revision_version,
    createdAt: toIso(row.created_at)
  };
}

function mapTournamentEntryRow(row: TournamentEntryRow): TournamentEntryRecord {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    botRevisionId: row.bot_revision_id,
    botId: row.bot_id,
    botName: row.bot_name,
    language: row.language,
    revisionVersion: row.revision_version,
    seed: row.seed,
    createdAt: toIso(row.created_at)
  };
}

async function withTransaction<T>(database: Database, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database.pool.connect();

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

async function resolveArenaRevisionId(client: PoolClient, arenaId?: string, arenaRevisionId?: string): Promise<string> {
  if (arenaRevisionId) {
    return arenaRevisionId;
  }

  if (!arenaId) {
    throw new Error("arenaId or arenaRevisionId is required");
  }

  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM arena_revisions
      WHERE arena_id = $1
      ORDER BY version DESC
      LIMIT 1
    `,
    [arenaId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`Arena ${arenaId} was not found`);
  }

  return row.id;
}

async function resolveLatestBotRevisionId(client: PoolClient, botId: string): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM bot_revisions
      WHERE bot_id = $1
      ORDER BY version DESC
      LIMIT 1
    `,
    [botId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`Bot ${botId} was not found`);
  }

  return row.id;
}

async function insertMatchRecord(
  client: PoolClient,
  input: {
    ownerUserId: string;
    name: string;
    mode: MatchMode;
    arenaRevisionId: string;
    seed: number;
    maxTicks: number;
    participants: Array<{ botRevisionId: string; teamId: TeamId }>;
    ladderId?: string;
    tournamentId?: string;
    tournamentRoundId?: string;
    roundSlot?: number;
  }
): Promise<string> {
  const matchId = randomUUID();

  await client.query(
    `
      INSERT INTO matches (
        id,
        owner_user_id,
        name,
        mode,
        status,
        arena_revision_id,
        seed,
        max_ticks,
        round_slot,
        ladder_id,
        tournament_id,
        tournament_round_id
      )
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      matchId,
      input.ownerUserId,
      input.name,
      input.mode,
      input.arenaRevisionId,
      input.seed,
      input.maxTicks,
      input.roundSlot ?? null,
      input.ladderId ?? null,
      input.tournamentId ?? null,
      input.tournamentRoundId ?? null
    ]
  );

  for (const [index, participant] of input.participants.entries()) {
    const insertParticipantResult = await client.query(
      `
        INSERT INTO match_participants (id, match_id, bot_revision_id, stats_mode, team_id, slot)
        SELECT $1, $2, $3, b.stats_mode, $4, $5
        FROM bot_revisions AS br
        JOIN bots AS b ON b.id = br.bot_id
        WHERE br.id = $3
      `,
      [randomUUID(), matchId, participant.botRevisionId, participant.teamId, index]
    );

    if ((insertParticipantResult.rowCount ?? 0) === 0) {
      throw new Error(`Bot revision ${participant.botRevisionId} was not found while creating scheduled match ${matchId}`);
    }
  }

  return matchId;
}

async function listLadderEntriesByIds(database: Database, ladderIds: string[]): Promise<Map<string, LadderEntryRecord[]>> {
  if (ladderIds.length === 0) {
    return new Map();
  }

  const result = await database.pool.query<LadderEntryRow>(
    `
      SELECT
        le.id,
        le.ladder_id,
        le.bot_revision_id,
        br.bot_id,
        b.name AS bot_name,
        br.language,
        br.version AS revision_version,
        le.created_at
      FROM ladder_entries AS le
      JOIN bot_revisions AS br ON br.id = le.bot_revision_id
      JOIN bots AS b ON b.id = br.bot_id
      WHERE le.ladder_id = ANY($1::text[])
      ORDER BY le.created_at ASC
    `,
    [ladderIds]
  );

  const entriesByLadder = new Map<string, LadderEntryRecord[]>();
  for (const row of result.rows) {
    const entry = mapLadderEntryRow(row);
    const list = entriesByLadder.get(entry.ladderId) ?? [];
    list.push(entry);
    entriesByLadder.set(entry.ladderId, list);
  }

  return entriesByLadder;
}

async function computeLadderStandingsByIds(
  database: Database,
  ladderIds: string[],
  entriesByLadder: Map<string, LadderEntryRecord[]>
): Promise<Map<string, LadderStandingRecord[]>> {
  const standingsByLadder = new Map<string, LadderStandingRecord[]>();

  for (const ladderId of ladderIds) {
    const entries = entriesByLadder.get(ladderId) ?? [];
    standingsByLadder.set(
      ladderId,
      entries.map((entry) => ({
        ladderEntryId: entry.id,
        botId: entry.botId,
        botName: entry.botName,
        rating: 1200,
        wins: 0,
        losses: 0,
        draws: 0,
        matches: 0
      }))
    );
  }

  if (ladderIds.length === 0) {
    return standingsByLadder;
  }

  const matchResult = await database.pool.query<LadderMatchRow>(
    `
      SELECT id, ladder_id, result_json, created_at
      FROM matches
      WHERE ladder_id = ANY($1::text[])
        AND status = 'completed'
      ORDER BY created_at ASC, round_slot ASC
    `,
    [ladderIds]
  );

  if (matchResult.rows.length === 0) {
    return standingsByLadder;
  }

  const participantResult = await database.pool.query<LadderMatchParticipantRow>(
    `
      SELECT
        mp.id,
        mp.match_id,
        mp.bot_revision_id,
        br.bot_id,
        b.name AS bot_name,
        mp.team_id
      FROM match_participants AS mp
      JOIN bot_revisions AS br ON br.id = mp.bot_revision_id
      JOIN bots AS b ON b.id = br.bot_id
      WHERE mp.match_id = ANY($1::text[])
      ORDER BY mp.slot ASC
    `,
    [matchResult.rows.map((row) => row.id)]
  );

  const participantsByMatch = new Map<string, LadderMatchParticipantRow[]>();
  for (const row of participantResult.rows) {
    const list = participantsByMatch.get(row.match_id) ?? [];
    list.push(row);
    participantsByMatch.set(row.match_id, list);
  }

  for (const match of matchResult.rows) {
    const standings = standingsByLadder.get(match.ladder_id) ?? [];
    const standingsByBotRevision = new Map(
      (entriesByLadder.get(match.ladder_id) ?? []).map((entry) => [entry.botRevisionId, standings.find((standing) => standing.ladderEntryId === entry.id)!])
    );
    const participants = participantsByMatch.get(match.id) ?? [];
    if (participants.length !== 2) {
      continue;
    }

    const leftStanding = standingsByBotRevision.get(participants[0].bot_revision_id);
    const rightStanding = standingsByBotRevision.get(participants[1].bot_revision_id);
    if (!leftStanding || !rightStanding) {
      continue;
    }

    leftStanding.matches += 1;
    rightStanding.matches += 1;

    const winner = getWinnerFromResult(match.result_json);
    const winnerParticipant =
      participants.find((participant) => participant.id === winner.winnerRobotId) ??
      participants.find((participant) => participant.team_id === winner.winnerTeamId);

    if (!winnerParticipant) {
      leftStanding.draws += 1;
      rightStanding.draws += 1;
      applyElo(leftStanding, rightStanding, 0.5, 0.5);
      continue;
    }

    const leftWon = winnerParticipant.id === participants[0].id;
    if (leftWon) {
      leftStanding.wins += 1;
      rightStanding.losses += 1;
      applyElo(leftStanding, rightStanding, 1, 0);
    } else {
      rightStanding.wins += 1;
      leftStanding.losses += 1;
      applyElo(leftStanding, rightStanding, 0, 1);
    }
  }

  for (const [ladderId, standings] of standingsByLadder) {
    standings.sort((left, right) => right.rating - left.rating || right.wins - left.wins || left.losses - right.losses || left.botName.localeCompare(right.botName));
    standingsByLadder.set(ladderId, standings);
  }

  return standingsByLadder;
}

export async function listLadders(database: Database, scope?: AccessScope): Promise<LadderRecord[]> {
  const params: unknown[] = [];
  const whereClause = scope && scope.role !== "admin" ? "WHERE l.owner_user_id = $1" : "";
  if (scope && scope.role !== "admin") {
    params.push(scope.userId);
  }

  const ladderResult = await database.pool.query<LadderRow>(
    `
      SELECT
        l.id,
        l.owner_user_id,
        u.email AS owner_email,
        l.name,
        l.description,
        l.arena_revision_id,
        a.id AS arena_id,
        a.name AS arena_name,
        l.max_ticks,
        l.created_at,
        l.updated_at
      FROM ladders AS l
      LEFT JOIN users AS u ON u.id = l.owner_user_id
      JOIN arena_revisions AS ar ON ar.id = l.arena_revision_id
      JOIN arenas AS a ON a.id = ar.arena_id
      ${whereClause}
      ORDER BY l.created_at DESC
    `,
    params
  );

  const ladderIds = ladderResult.rows.map((row) => row.id);
  const entriesByLadder = await listLadderEntriesByIds(database, ladderIds);
  const standingsByLadder = await computeLadderStandingsByIds(database, ladderIds, entriesByLadder);

  return ladderResult.rows.map((row) => ({
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerEmail: row.owner_email,
    name: row.name,
    description: row.description,
    arenaRevisionId: row.arena_revision_id,
    arenaId: row.arena_id,
    arenaName: row.arena_name,
    maxTicks: row.max_ticks,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    entries: entriesByLadder.get(row.id) ?? [],
    standings: standingsByLadder.get(row.id) ?? []
  }));
}

export async function getLadder(database: Database, ladderId: string, scope?: AccessScope): Promise<LadderRecord | null> {
  const ladders = await listLadders(database, scope);
  return ladders.find((ladder) => ladder.id === ladderId) ?? null;
}

export async function createLadder(database: Database, input: CreateLadderInput): Promise<LadderRecord> {
  const ladderId = await withTransaction(database, async (client) => {
    const createdLadderId = randomUUID();
    const arenaRevisionId = await resolveArenaRevisionId(client, input.arenaId, input.arenaRevisionId);

    await client.query(
      `
        INSERT INTO ladders (id, owner_user_id, name, description, arena_revision_id, max_ticks)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [createdLadderId, input.ownerUserId, input.name, input.description ?? "", arenaRevisionId, input.maxTicks]
    );

    for (const botId of input.entryBotIds) {
      const botRevisionId = await resolveLatestBotRevisionId(client, botId);
      await client.query(
        `
          INSERT INTO ladder_entries (id, ladder_id, bot_revision_id)
          VALUES ($1, $2, $3)
        `,
        [randomUUID(), createdLadderId, botRevisionId]
      );
    }

    return createdLadderId;
  });

  const ladder = await getLadder(database, ladderId);
  if (!ladder) {
    throw new Error(`Failed to reload ladder ${ladderId}`);
  }

  return ladder;
}

export async function createLadderChallenge(database: Database, input: CreateLadderChallengeInput): Promise<MatchRecord> {
  const ladder = await getLadder(database, input.ladderId);
  if (!ladder) {
    throw new Error(`Ladder ${input.ladderId} was not found`);
  }
  if (!ladder.ownerUserId) {
    throw new Error(`Ladder ${input.ladderId} does not have an owner`);
  }
  const ladderOwnerUserId = ladder.ownerUserId;

  const entriesById = new Map(ladder.entries.map((entry) => [entry.id, entry]));
  const [entryA, entryB] = input.entryAId && input.entryBId
    ? [entriesById.get(input.entryAId) ?? null, entriesById.get(input.entryBId) ?? null]
    : [ladder.standings[0] ? entriesById.get(ladder.standings[0].ladderEntryId) ?? null : null, ladder.standings[1] ? entriesById.get(ladder.standings[1].ladderEntryId) ?? null : null];

  if (!entryA || !entryB) {
    throw new Error("A ladder challenge requires two ladder entries");
  }

  const matchId = await withTransaction(database, async (client) =>
    insertMatchRecord(client, {
      ownerUserId: ladderOwnerUserId,
      name: `${ladder.name}: ${entryA.botName} vs ${entryB.botName}`,
      mode: "ladder",
      arenaRevisionId: ladder.arenaRevisionId,
      seed: input.seed,
      maxTicks: input.maxTicks ?? ladder.maxTicks,
      ladderId: ladder.id,
      participants: [
        { botRevisionId: entryA.botRevisionId, teamId: "A" },
        { botRevisionId: entryB.botRevisionId, teamId: "B" }
      ]
    })
  );

  const match = await database.getMatch(matchId);
  if (!match) {
    throw new Error(`Failed to reload ladder match ${matchId}`);
  }

  return match;
}

function buildRoundRobinSchedule(entries: TournamentEntryRecord[]): ScheduleRound[] {
  const working: Array<ScheduleEntry> = [...entries];
  if (working.length % 2 !== 0) {
    working.push(null);
  }

  if (working.length < 2) {
    return [];
  }

  const rounds: ScheduleRound[] = [];
  let rotation = [...working];

  for (let roundIndex = 0; roundIndex < rotation.length - 1; roundIndex += 1) {
    const pairings: Array<[ScheduleEntry, ScheduleEntry]> = [];

    for (let index = 0; index < rotation.length / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[rotation.length - 1 - index];
      if (!left && !right) {
        continue;
      }

      pairings.push(roundIndex % 2 === 0 ? [left, right] : [right, left]);
    }

    rounds.push({
      bracket: "round-robin",
      roundNumber: roundIndex + 1,
      label: `Round Robin ${roundIndex + 1}`,
      pairings
    });

    const [fixed, ...rest] = rotation;
    const moved = rest.pop() ?? null;
    rotation = [fixed ?? null, moved, ...rest];
  }

  return rounds;
}

function buildSingleEliminationSchedule(entries: TournamentEntryRecord[]): ScheduleRound[] {
  if (entries.length === 0) {
    return [];
  }

  const size = nextPowerOfTwo(entries.length);
  const padded: Array<ScheduleEntry> = [...entries, ...Array.from({ length: size - entries.length }, () => null)];
  const totalRounds = Math.max(1, Math.log2(size));
  const rounds: ScheduleRound[] = [];

  rounds.push({
    bracket: "winners",
    roundNumber: 1,
    label: "Winners Round 1",
    pairings: Array.from({ length: padded.length / 2 }, (_, index) => [padded[index * 2] ?? null, padded[index * 2 + 1] ?? null])
  });

  for (let roundNumber = 2; roundNumber <= totalRounds; roundNumber += 1) {
    rounds.push({
      bracket: "winners",
      roundNumber,
      label: `Winners Round ${roundNumber}`,
      pairings: []
    });
  }

  return rounds;
}

function buildDoubleEliminationSchedule(entries: TournamentEntryRecord[]): ScheduleRound[] {
  const winners = buildSingleEliminationSchedule(entries);
  if (winners.length === 0) {
    return [];
  }

  const rounds: ScheduleRound[] = [...winners];
  const loserRounds = Math.max(1, winners.length * 2 - 2);
  for (let roundNumber = 1; roundNumber <= loserRounds; roundNumber += 1) {
    rounds.push({
      bracket: "losers",
      roundNumber,
      label: `Losers Round ${roundNumber}`,
      pairings: []
    });
  }

  rounds.push({
    bracket: "finals",
    roundNumber: 1,
    label: "Grand Final",
    pairings: []
  });

  return rounds;
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

export function buildTournamentSchedule(format: TournamentFormat, entries: TournamentEntryRecord[]): ScheduleRound[] {
  switch (format) {
    case "round-robin":
      return buildRoundRobinSchedule(entries);
    case "single-elimination":
      return buildSingleEliminationSchedule(entries);
    case "double-elimination":
      return buildDoubleEliminationSchedule(entries);
  }
}

async function listTournamentEntriesByIds(database: Database, tournamentIds: string[]): Promise<Map<string, TournamentEntryRecord[]>> {
  if (tournamentIds.length === 0) {
    return new Map();
  }

  const result = await database.pool.query<TournamentEntryRow>(
    `
      SELECT
        te.id,
        te.tournament_id,
        te.bot_revision_id,
        br.bot_id,
        b.name AS bot_name,
        br.language,
        br.version AS revision_version,
        te.seed,
        te.created_at
      FROM tournament_entries AS te
      JOIN bot_revisions AS br ON br.id = te.bot_revision_id
      JOIN bots AS b ON b.id = br.bot_id
      WHERE te.tournament_id = ANY($1::text[])
      ORDER BY te.seed ASC
    `,
    [tournamentIds]
  );

  const entriesByTournament = new Map<string, TournamentEntryRecord[]>();
  for (const row of result.rows) {
    const entry = mapTournamentEntryRow(row);
    const list = entriesByTournament.get(entry.tournamentId) ?? [];
    list.push(entry);
    entriesByTournament.set(entry.tournamentId, list);
  }

  return entriesByTournament;
}

function bracketOrderValue(bracket: TournamentBracket): number {
  switch (bracket) {
    case "round-robin":
      return 0;
    case "winners":
      return 1;
    case "losers":
      return 2;
    case "finals":
      return 3;
  }
}

async function listTournamentRoundsByIds(database: Database, tournamentIds: string[]): Promise<Map<string, TournamentRoundRecord[]>> {
  if (tournamentIds.length === 0) {
    return new Map();
  }

  const roundResult = await database.pool.query<TournamentRoundRow>(
    `
      SELECT id, tournament_id, bracket, round_number, label, created_at
      FROM tournament_rounds
      WHERE tournament_id = ANY($1::text[])
      ORDER BY
        CASE bracket
          WHEN 'round-robin' THEN 0
          WHEN 'winners' THEN 1
          WHEN 'losers' THEN 2
          ELSE 3
        END ASC,
        round_number ASC,
        created_at ASC
    `,
    [tournamentIds]
  );

  const linkResult = await database.pool.query<TournamentMatchLinkRow>(
    `
      SELECT id, tournament_id, tournament_round_id, round_slot
      FROM matches
      WHERE tournament_id = ANY($1::text[])
      ORDER BY tournament_round_id ASC, round_slot ASC, created_at ASC
    `,
    [tournamentIds]
  );

  const matchCache = new Map<string, MatchRecord>();
  for (const row of linkResult.rows) {
    const match = await database.getMatch(row.id);
    if (match) {
      matchCache.set(row.id, match);
    }
  }

  const matchesByRound = new Map<string, MatchRecord[]>();
  for (const row of linkResult.rows) {
    if (!row.tournament_round_id) {
      continue;
    }

    const list = matchesByRound.get(row.tournament_round_id) ?? [];
    const match = matchCache.get(row.id);
    if (match) {
      const insertAt = row.round_slot ?? list.length;
      list.splice(Math.min(insertAt, list.length), 0, match);
      matchesByRound.set(row.tournament_round_id, list);
    }
  }

  const roundsByTournament = new Map<string, TournamentRoundRecord[]>();
  for (const row of roundResult.rows) {
    const round: TournamentRoundRecord = {
      id: row.id,
      tournamentId: row.tournament_id,
      bracket: row.bracket,
      roundNumber: row.round_number,
      label: row.label,
      createdAt: toIso(row.created_at),
      matches: matchesByRound.get(row.id) ?? []
    };

    const list = roundsByTournament.get(round.tournamentId) ?? [];
    list.push(round);
    roundsByTournament.set(round.tournamentId, list);
  }

  return roundsByTournament;
}

function resolveTournamentChampion(
  format: TournamentFormat,
  rounds: TournamentRoundRecord[]
): MatchParticipantRecord | null {
  if (format === "round-robin") {
    const totalMatches = rounds.reduce((count, round) => count + round.matches.length, 0);
    const completedMatches = rounds
      .flatMap((round) => round.matches)
      .filter((match) => match.status === "completed");

    if (totalMatches === 0 || completedMatches.length !== totalMatches) {
      return null;
    }

    return null;
  }

  const finalsRound = [...rounds]
    .filter((round) => round.bracket === "finals")
    .sort((left, right) => right.roundNumber - left.roundNumber)[0];
  if (finalsRound) {
    const finalsWinner = [...finalsRound.matches]
      .filter((match) => match.status === "completed")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((match) => getMatchWinnerParticipant(match))
      .filter((participant) => participant !== null)
      .at(-1);
    if (finalsWinner) {
      return finalsWinner;
    }
  }

  const lastWinnersRound = [...rounds]
    .filter((round) => round.bracket === "winners")
    .sort((left, right) => right.roundNumber - left.roundNumber)[0];
  if (!lastWinnersRound) {
    return null;
  }

  const completedFinal = lastWinnersRound.matches.find((match) => match.status === "completed");
  return completedFinal ? getMatchWinnerParticipant(completedFinal) : null;
}

export function computeTournamentMetrics(
  format: TournamentFormat,
  entries: TournamentEntryRecord[],
  rounds: TournamentRoundRecord[]
): { standings: TournamentStandingRecord[]; summary: TournamentSummaryRecord } {
  const standingsByRevision = new Map<string, TournamentStandingRecord>(
    entries.map((entry) => [
      entry.botRevisionId,
      {
        tournamentEntryId: entry.id,
        botId: entry.botId,
        botName: entry.botName,
        seed: entry.seed,
        wins: 0,
        losses: 0,
        draws: 0,
        matches: 0,
        points: 0,
        eliminated: false
      }
    ])
  );

  const orderedMatches = rounds
    .flatMap((round) => round.matches.map((match) => ({ round, match })))
    .sort((left, right) => {
      const bracketDelta = bracketOrderValue(left.round.bracket) - bracketOrderValue(right.round.bracket);
      if (bracketDelta !== 0) {
        return bracketDelta;
      }

      const roundDelta = left.round.roundNumber - right.round.roundNumber;
      if (roundDelta !== 0) {
        return roundDelta;
      }

      return left.match.createdAt.localeCompare(right.match.createdAt);
    });

  let completedMatches = 0;
  let pendingMatches = 0;
  let queuedMatches = 0;
  let runningMatches = 0;
  let failedMatches = 0;

  for (const { match } of orderedMatches) {
    switch (match.status) {
      case "completed":
        completedMatches += 1;
        break;
      case "pending":
        pendingMatches += 1;
        break;
      case "queued":
        queuedMatches += 1;
        break;
      case "running":
        runningMatches += 1;
        break;
      case "failed":
        failedMatches += 1;
        break;
    }

    if (match.status !== "completed" || match.participants.length < 2) {
      continue;
    }

    const left = standingsByRevision.get(match.participants[0].botRevisionId);
    const right = standingsByRevision.get(match.participants[1].botRevisionId);
    if (!left || !right) {
      continue;
    }

    left.matches += 1;
    right.matches += 1;

    const winner = getMatchWinnerParticipant(match);
    if (!winner) {
      left.draws += 1;
      right.draws += 1;
      left.points += 1;
      right.points += 1;
      continue;
    }

    if (winner.id === match.participants[0].id) {
      left.wins += 1;
      left.points += 3;
      right.losses += 1;
    } else {
      right.wins += 1;
      right.points += 3;
      left.losses += 1;
    }
  }

  const eliminationChampion = resolveTournamentChampion(format, rounds);
  const standings = [...standingsByRevision.values()];

  for (const standing of standings) {
    if (eliminationChampion && standing.botId === eliminationChampion.botId) {
      standing.eliminated = false;
      continue;
    }

    switch (format) {
      case "round-robin":
        standing.eliminated = false;
        break;
      case "single-elimination":
        standing.eliminated = standing.losses > 0;
        break;
      case "double-elimination":
        standing.eliminated = standing.losses > 1;
        break;
    }
  }

  standings.sort((left, right) => {
    if (format === "round-robin") {
      return (
        right.points - left.points ||
        right.wins - left.wins ||
        left.losses - right.losses ||
        left.seed - right.seed ||
        left.botName.localeCompare(right.botName)
      );
    }

    return (
      Number(left.eliminated) - Number(right.eliminated) ||
      right.wins - left.wins ||
      left.losses - right.losses ||
      left.seed - right.seed ||
      left.botName.localeCompare(right.botName)
    );
  });

  const leader = standings[0] ?? null;
  const champion =
    format === "round-robin" && orderedMatches.length > 0 && completedMatches === orderedMatches.length
      ? leader
      : eliminationChampion;

  return {
    standings,
    summary: {
      totalMatches: orderedMatches.length,
      completedMatches,
      pendingMatches,
      queuedMatches,
      runningMatches,
      failedMatches,
      leaderBotId: leader?.botId ?? null,
      leaderBotName: leader?.botName ?? null,
      championBotId: champion?.botId ?? null,
      championBotName: champion?.botName ?? null
    }
  };
}

export async function listTournaments(database: Database, scope?: AccessScope): Promise<TournamentRecord[]> {
  const params: unknown[] = [];
  const whereClause = scope && scope.role !== "admin" ? "WHERE t.owner_user_id = $1" : "";
  if (scope && scope.role !== "admin") {
    params.push(scope.userId);
  }

  const tournamentResult = await database.pool.query<TournamentRow>(
    `
      SELECT
        t.id,
        t.owner_user_id,
        u.email AS owner_email,
        t.name,
        t.description,
        t.format,
        t.arena_revision_id,
        a.id AS arena_id,
        a.name AS arena_name,
        t.max_ticks,
        t.seed_base,
        t.created_at,
        t.updated_at
      FROM tournaments AS t
      LEFT JOIN users AS u ON u.id = t.owner_user_id
      JOIN arena_revisions AS ar ON ar.id = t.arena_revision_id
      JOIN arenas AS a ON a.id = ar.arena_id
      ${whereClause}
      ORDER BY t.created_at DESC
    `,
    params
  );

  const tournamentIds = tournamentResult.rows.map((row) => row.id);
  const entriesByTournament = await listTournamentEntriesByIds(database, tournamentIds);
  const roundsByTournament = await listTournamentRoundsByIds(database, tournamentIds);

  return tournamentResult.rows.map((row) => {
    const entries = entriesByTournament.get(row.id) ?? [];
    const rounds = roundsByTournament.get(row.id) ?? [];
    const metrics = computeTournamentMetrics(row.format, entries, rounds);

    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      ownerEmail: row.owner_email,
      name: row.name,
      description: row.description,
      format: row.format,
      arenaRevisionId: row.arena_revision_id,
      arenaId: row.arena_id,
      arenaName: row.arena_name,
      maxTicks: row.max_ticks,
      seedBase: row.seed_base,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
      entries,
      rounds,
      standings: metrics.standings,
      summary: metrics.summary
    };
  });
}

export async function getTournament(database: Database, tournamentId: string, scope?: AccessScope): Promise<TournamentRecord | null> {
  const tournaments = await listTournaments(database, scope);
  return tournaments.find((tournament) => tournament.id === tournamentId) ?? null;
}

export async function createTournament(database: Database, input: CreateTournamentInput): Promise<TournamentRecord> {
  const tournamentId = await withTransaction(database, async (client) => {
    const createdTournamentId = randomUUID();
    const arenaRevisionId = await resolveArenaRevisionId(client, input.arenaId, input.arenaRevisionId);

    if (input.format !== "round-robin" && !isPowerOfTwo(input.entryBotIds.length)) {
      throw new Error("Elimination tournaments currently require a power-of-two entrant count");
    }

    await client.query(
      `
        INSERT INTO tournaments (id, owner_user_id, name, description, format, arena_revision_id, max_ticks, seed_base)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [createdTournamentId, input.ownerUserId, input.name, input.description ?? "", input.format, arenaRevisionId, input.maxTicks, input.seedBase]
    );

    const entries: TournamentEntryRecord[] = [];
    for (const [index, botId] of input.entryBotIds.entries()) {
      const botRevisionId = await resolveLatestBotRevisionId(client, botId);
      const entryId = randomUUID();
      await client.query(
        `
          INSERT INTO tournament_entries (id, tournament_id, bot_revision_id, seed)
          VALUES ($1, $2, $3, $4)
        `,
        [entryId, createdTournamentId, botRevisionId, index + 1]
      );

      const botResult = await client.query<{ name: string; language: string; version: number }>(
        `
          SELECT b.name, br.language, br.version
          FROM bot_revisions AS br
          JOIN bots AS b ON b.id = br.bot_id
          WHERE br.id = $1
        `,
        [botRevisionId]
      );

      const bot = botResult.rows[0];
      entries.push({
        id: entryId,
        tournamentId: createdTournamentId,
        botRevisionId,
        botId,
        botName: bot?.name ?? botId,
        language: bot?.language ?? "javascript",
        revisionVersion: bot?.version ?? 1,
        seed: index + 1,
        createdAt: new Date().toISOString()
      });
    }

    const rounds = buildTournamentSchedule(input.format, entries);
    let scheduledMatchIndex = 0;
    for (const round of rounds) {
      const roundId = randomUUID();
      await client.query(
        `
          INSERT INTO tournament_rounds (id, tournament_id, bracket, round_number, label)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [roundId, createdTournamentId, round.bracket, round.roundNumber, round.label]
      );

      for (const [pairingIndex, pairing] of round.pairings.entries()) {
        const [left, right] = pairing;
        if (!left || !right) {
          continue;
        }

        scheduledMatchIndex += 1;
        await insertMatchRecord(client, {
          ownerUserId: input.ownerUserId,
          name: `${input.name}: ${round.label} Match ${pairingIndex + 1}`,
          mode: input.format,
          arenaRevisionId,
          seed: input.seedBase + scheduledMatchIndex,
          maxTicks: input.maxTicks,
          tournamentId: createdTournamentId,
          tournamentRoundId: roundId,
          roundSlot: pairingIndex,
          participants: [
            { botRevisionId: left.botRevisionId, teamId: "A" },
            { botRevisionId: right.botRevisionId, teamId: "B" }
          ]
        });
      }
    }

    return createdTournamentId;
  });

  const tournament = await getTournament(database, tournamentId);
  if (!tournament) {
    throw new Error(`Failed to reload tournament ${tournamentId}`);
  }

  return tournament;
}


export async function listPendingTournamentMatches(
  database: Database,
  tournamentId: string,
  options: TournamentPendingMatchOptions = {}
): Promise<MatchRecord[]> {
  const values: Array<string | number> = [tournamentId];
  const clauses = ["m.tournament_id = $1", "m.status = 'pending'"];

  if (options.roundId) {
    values.push(options.roundId);
    clauses.push(`m.tournament_round_id = $${values.length}`);
  }

  let limitSql = "";
  if (options.limit !== undefined) {
    values.push(options.limit);
    limitSql = `LIMIT $${values.length}`;
  }

  const result = await database.pool.query<{ id: string }>(
    `
      SELECT m.id
      FROM matches AS m
      JOIN tournament_rounds AS tr ON tr.id = m.tournament_round_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY
        CASE tr.bracket
          WHEN 'round-robin' THEN 0
          WHEN 'winners' THEN 1
          WHEN 'losers' THEN 2
          ELSE 3
        END ASC,
        tr.round_number ASC,
        m.round_slot ASC NULLS LAST,
        m.created_at ASC
      ${limitSql}
    `,
    values
  );

  const matches: MatchRecord[] = [];
  for (const row of result.rows) {
    const match = await database.getMatch(row.id);
    if (match) {
      matches.push(match);
    }
  }

  return matches;
}

type TournamentProgressMatchRow = {
  id: string;
  tournament_id: string;
  tournament_owner_user_id: string;
  tournament_name: string;
  tournament_format: TournamentFormat;
  tournament_seed_base: number;
  tournament_round_id: string;
  round_slot: number | null;
  status: string;
  arena_revision_id: string;
  max_ticks: number;
  round_number: number;
  round_label: string;
  bracket: TournamentBracket;
};

type MatchParticipantOutcomeRow = {
  participant_id: string;
  bot_revision_id: string;
  bot_name: string;
  team_id: TeamId;
  slot: number;
  result_json: unknown;
};

function resolveWinnerParticipant(rows: MatchParticipantOutcomeRow[]): MatchParticipantOutcomeRow | null {
  if (rows.length === 0) {
    return null;
  }

  const winner = getWinnerFromResult(rows[0].result_json);
  return (
    rows.find((row) => row.participant_id === winner.winnerRobotId) ??
    rows.find((row) => row.team_id === winner.winnerTeamId) ??
    null
  );
}

function resolveLoserParticipant(rows: MatchParticipantOutcomeRow[]): MatchParticipantOutcomeRow | null {
  if (rows.length !== 2) {
    return null;
  }

  const winner = resolveWinnerParticipant(rows);
  if (!winner) {
    return null;
  }

  return rows.find((row) => row.participant_id !== winner.participant_id) ?? null;
}

async function getCompletedMatchParticipants(client: PoolClient, matchId: string): Promise<MatchParticipantOutcomeRow[]> {
  const result = await client.query<MatchParticipantOutcomeRow>(
    `
      SELECT
        mp.id AS participant_id,
        mp.bot_revision_id,
        b.name AS bot_name,
        mp.team_id,
        mp.slot,
        m.result_json
      FROM matches AS m
      JOIN match_participants AS mp ON mp.match_id = m.id
      JOIN bot_revisions AS br ON br.id = mp.bot_revision_id
      JOIN bots AS b ON b.id = br.bot_id
      WHERE m.id = $1
      ORDER BY mp.slot ASC
    `,
    [matchId]
  );

  return result.rows;
}

async function getCompletedMatchWinner(client: PoolClient, matchId: string): Promise<MatchParticipantOutcomeRow | null> {
  return resolveWinnerParticipant(await getCompletedMatchParticipants(client, matchId));
}

async function getCompletedMatchLoser(client: PoolClient, matchId: string): Promise<MatchParticipantOutcomeRow | null> {
  return resolveLoserParticipant(await getCompletedMatchParticipants(client, matchId));
}

async function getTournamentRound(
  client: PoolClient,
  tournamentId: string,
  bracket: TournamentBracket,
  roundNumber: number
): Promise<{ id: string; label: string; round_number: number } | null> {
  const result = await client.query<{ id: string; label: string; round_number: number }>(
    `
      SELECT id, label, round_number
      FROM tournament_rounds
      WHERE tournament_id = $1
        AND bracket = $2
        AND round_number = $3
      LIMIT 1
    `,
    [tournamentId, bracket, roundNumber]
  );

  return result.rows[0] ?? null;
}

async function getWinnerRoundCount(client: PoolClient, tournamentId: string): Promise<number> {
  const result = await client.query<{ max_round_number: number | null }>(
    `
      SELECT MAX(round_number) AS max_round_number
      FROM tournament_rounds
      WHERE tournament_id = $1
        AND bracket = 'winners'
    `,
    [tournamentId]
  );

  return result.rows[0]?.max_round_number ?? 0;
}

async function getRoundMatchBySlot(
  client: PoolClient,
  roundId: string,
  roundSlot: number
): Promise<{ id: string; status: string } | null> {
  const result = await client.query<{ id: string; status: string }>(
    `
      SELECT id, status
      FROM matches
      WHERE tournament_round_id = $1
        AND round_slot = $2
      LIMIT 1
    `,
    [roundId, roundSlot]
  );

  return result.rows[0] ?? null;
}

async function insertTournamentRoundMatch(
  client: PoolClient,
  input: {
    ownerUserId: string;
    tournamentId: string;
    tournamentName: string;
    mode: MatchMode;
    arenaRevisionId: string;
    seedBase: number;
    maxTicks: number;
    round: { id: string; label: string; round_number: number };
    roundSlot: number;
    participants: Array<{ botRevisionId: string; teamId: TeamId }>;
    suffix?: string;
  }
): Promise<string | null> {
  try {
    return await insertMatchRecord(client, {
      ownerUserId: input.ownerUserId,
      name: `${input.tournamentName}: ${input.round.label}${input.suffix ? ` ${input.suffix}` : ""} Match ${input.roundSlot + 1}`,
      mode: input.mode,
      arenaRevisionId: input.arenaRevisionId,
      seed: input.seedBase + input.round.round_number * 100 + input.roundSlot,
      maxTicks: input.maxTicks,
      tournamentId: input.tournamentId,
      tournamentRoundId: input.round.id,
      roundSlot: input.roundSlot,
      participants: input.participants
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return null;
    }

    throw error;
  }
}

async function advanceWinnerBracketMatch(
  client: PoolClient,
  currentMatch: TournamentProgressMatchRow,
  winnerRoundCount: number,
  winner: MatchParticipantOutcomeRow
): Promise<string[]> {
  if (currentMatch.round_slot === null || currentMatch.round_number >= winnerRoundCount) {
    return [];
  }

  const nextRound = await getTournamentRound(client, currentMatch.tournament_id, "winners", currentMatch.round_number + 1);
  if (!nextRound) {
    return [];
  }

  const siblingSlot = currentMatch.round_slot % 2 === 0 ? currentMatch.round_slot + 1 : currentMatch.round_slot - 1;
  const sibling = await getRoundMatchBySlot(client, currentMatch.tournament_round_id, siblingSlot);
  if (!sibling || sibling.status !== "completed") {
    return [];
  }

  const nextRoundSlot = Math.floor(currentMatch.round_slot / 2);
  const existingNextMatch = await getRoundMatchBySlot(client, nextRound.id, nextRoundSlot);
  if (existingNextMatch) {
    return [];
  }

  const siblingWinner = await getCompletedMatchWinner(client, sibling.id);
  if (!siblingWinner) {
    return [];
  }

  const leftWinner = currentMatch.round_slot % 2 === 0 ? winner : siblingWinner;
  const rightWinner = currentMatch.round_slot % 2 === 0 ? siblingWinner : winner;

  const createdMatchId = await insertTournamentRoundMatch(client, {
    ownerUserId: currentMatch.tournament_owner_user_id,
    tournamentId: currentMatch.tournament_id,
    tournamentName: currentMatch.tournament_name,
    mode: currentMatch.tournament_format,
    arenaRevisionId: currentMatch.arena_revision_id,
    seedBase: currentMatch.tournament_seed_base,
    maxTicks: currentMatch.max_ticks,
    round: nextRound,
    roundSlot: nextRoundSlot,
    participants: [
      { botRevisionId: leftWinner.bot_revision_id, teamId: "A" },
      { botRevisionId: rightWinner.bot_revision_id, teamId: "B" }
    ]
  });

  return createdMatchId ? [createdMatchId] : [];
}

async function advanceDoubleEliminationWinnersLoser(
  client: PoolClient,
  currentMatch: TournamentProgressMatchRow,
  loser: MatchParticipantOutcomeRow,
  winnerRoundCount: number
): Promise<string[]> {
  if (currentMatch.round_slot === null) {
    return [];
  }

  if (currentMatch.round_number === 1) {
    const targetRound = await getTournamentRound(client, currentMatch.tournament_id, "losers", 1);
    if (!targetRound) {
      return [];
    }

    const siblingSlot = currentMatch.round_slot % 2 === 0 ? currentMatch.round_slot + 1 : currentMatch.round_slot - 1;
    const sibling = await getRoundMatchBySlot(client, currentMatch.tournament_round_id, siblingSlot);
    if (!sibling || sibling.status !== "completed") {
      return [];
    }

    const targetSlot = Math.floor(currentMatch.round_slot / 2);
    const existing = await getRoundMatchBySlot(client, targetRound.id, targetSlot);
    if (existing) {
      return [];
    }

    const siblingLoser = await getCompletedMatchLoser(client, sibling.id);
    if (!siblingLoser) {
      return [];
    }

    const leftLoser = currentMatch.round_slot % 2 === 0 ? loser : siblingLoser;
    const rightLoser = currentMatch.round_slot % 2 === 0 ? siblingLoser : loser;

    const createdMatchId = await insertTournamentRoundMatch(client, {
      ownerUserId: currentMatch.tournament_owner_user_id,
      tournamentId: currentMatch.tournament_id,
      tournamentName: currentMatch.tournament_name,
      mode: currentMatch.tournament_format,
      arenaRevisionId: currentMatch.arena_revision_id,
      seedBase: currentMatch.tournament_seed_base,
      maxTicks: currentMatch.max_ticks,
      round: targetRound,
      roundSlot: targetSlot,
      participants: [
        { botRevisionId: leftLoser.bot_revision_id, teamId: "A" },
        { botRevisionId: rightLoser.bot_revision_id, teamId: "B" }
      ]
    });

    return createdMatchId ? [createdMatchId] : [];
  }

  const loserRoundNumber = currentMatch.round_number === winnerRoundCount ? winnerRoundCount * 2 - 2 : currentMatch.round_number * 2 - 2;
  const targetRound = await getTournamentRound(client, currentMatch.tournament_id, "losers", loserRoundNumber);
  if (!targetRound) {
    return [];
  }

  const existing = await getRoundMatchBySlot(client, targetRound.id, currentMatch.round_slot);
  if (existing) {
    return [];
  }

  const feederRound = await getTournamentRound(client, currentMatch.tournament_id, "losers", loserRoundNumber - 1);
  if (!feederRound) {
    return [];
  }

  const feederMatch = await getRoundMatchBySlot(client, feederRound.id, currentMatch.round_slot);
  if (!feederMatch || feederMatch.status !== "completed") {
    return [];
  }

  const feederWinner = await getCompletedMatchWinner(client, feederMatch.id);
  if (!feederWinner) {
    return [];
  }

  const createdMatchId = await insertTournamentRoundMatch(client, {
    ownerUserId: currentMatch.tournament_owner_user_id,
    tournamentId: currentMatch.tournament_id,
    tournamentName: currentMatch.tournament_name,
    mode: currentMatch.tournament_format,
    arenaRevisionId: currentMatch.arena_revision_id,
    seedBase: currentMatch.tournament_seed_base,
    maxTicks: currentMatch.max_ticks,
    round: targetRound,
    roundSlot: currentMatch.round_slot,
    participants: [
      { botRevisionId: feederWinner.bot_revision_id, teamId: "A" },
      { botRevisionId: loser.bot_revision_id, teamId: "B" }
    ]
  });

  return createdMatchId ? [createdMatchId] : [];
}

async function advanceDoubleEliminationLosersWinner(
  client: PoolClient,
  currentMatch: TournamentProgressMatchRow,
  winner: MatchParticipantOutcomeRow,
  winnerRoundCount: number
): Promise<string[]> {
  if (currentMatch.round_slot === null) {
    return [];
  }

  const finalLoserRound = winnerRoundCount * 2 - 2;
  if (currentMatch.round_number === finalLoserRound) {
    const finalsRound = await getTournamentRound(client, currentMatch.tournament_id, "finals", 1);
    if (!finalsRound) {
      return [];
    }

    const existing = await getRoundMatchBySlot(client, finalsRound.id, 0);
    if (existing) {
      return [];
    }

    const winnersFinalRound = await getTournamentRound(client, currentMatch.tournament_id, "winners", winnerRoundCount);
    if (!winnersFinalRound) {
      return [];
    }

    const winnersFinal = await getRoundMatchBySlot(client, winnersFinalRound.id, 0);
    if (!winnersFinal || winnersFinal.status !== "completed") {
      return [];
    }

    const winnersChampion = await getCompletedMatchWinner(client, winnersFinal.id);
    if (!winnersChampion) {
      return [];
    }

    const createdMatchId = await insertTournamentRoundMatch(client, {
      ownerUserId: currentMatch.tournament_owner_user_id,
      tournamentId: currentMatch.tournament_id,
      tournamentName: currentMatch.tournament_name,
      mode: currentMatch.tournament_format,
      arenaRevisionId: currentMatch.arena_revision_id,
      seedBase: currentMatch.tournament_seed_base,
      maxTicks: currentMatch.max_ticks,
      round: finalsRound,
      roundSlot: 0,
      participants: [
        { botRevisionId: winnersChampion.bot_revision_id, teamId: "A" },
        { botRevisionId: winner.bot_revision_id, teamId: "B" }
      ]
    });

    return createdMatchId ? [createdMatchId] : [];
  }

  if (currentMatch.round_number % 2 === 1) {
    const targetRound = await getTournamentRound(client, currentMatch.tournament_id, "losers", currentMatch.round_number + 1);
    if (!targetRound) {
      return [];
    }

    const existing = await getRoundMatchBySlot(client, targetRound.id, currentMatch.round_slot);
    if (existing) {
      return [];
    }

    const sourceWinnerRoundNumber = Math.floor((currentMatch.round_number + 3) / 2);
    const sourceWinnerRound = await getTournamentRound(client, currentMatch.tournament_id, "winners", sourceWinnerRoundNumber);
    if (!sourceWinnerRound) {
      return [];
    }

    const sourceWinnerMatch = await getRoundMatchBySlot(client, sourceWinnerRound.id, currentMatch.round_slot);
    if (!sourceWinnerMatch || sourceWinnerMatch.status !== "completed") {
      return [];
    }

    const droppedLoser = await getCompletedMatchLoser(client, sourceWinnerMatch.id);
    if (!droppedLoser) {
      return [];
    }

    const createdMatchId = await insertTournamentRoundMatch(client, {
      ownerUserId: currentMatch.tournament_owner_user_id,
      tournamentId: currentMatch.tournament_id,
      tournamentName: currentMatch.tournament_name,
      mode: currentMatch.tournament_format,
      arenaRevisionId: currentMatch.arena_revision_id,
      seedBase: currentMatch.tournament_seed_base,
      maxTicks: currentMatch.max_ticks,
      round: targetRound,
      roundSlot: currentMatch.round_slot,
      participants: [
        { botRevisionId: winner.bot_revision_id, teamId: "A" },
        { botRevisionId: droppedLoser.bot_revision_id, teamId: "B" }
      ]
    });

    return createdMatchId ? [createdMatchId] : [];
  }

  const targetRound = await getTournamentRound(client, currentMatch.tournament_id, "losers", currentMatch.round_number + 1);
  if (!targetRound) {
    return [];
  }

  const targetSlot = Math.floor(currentMatch.round_slot / 2);
  const existing = await getRoundMatchBySlot(client, targetRound.id, targetSlot);
  if (existing) {
    return [];
  }

  const siblingSlot = currentMatch.round_slot % 2 === 0 ? currentMatch.round_slot + 1 : currentMatch.round_slot - 1;
  const sibling = await getRoundMatchBySlot(client, currentMatch.tournament_round_id, siblingSlot);
  if (!sibling || sibling.status !== "completed") {
    return [];
  }

  const siblingWinner = await getCompletedMatchWinner(client, sibling.id);
  if (!siblingWinner) {
    return [];
  }

  const leftWinner = currentMatch.round_slot % 2 === 0 ? winner : siblingWinner;
  const rightWinner = currentMatch.round_slot % 2 === 0 ? siblingWinner : winner;

  const createdMatchId = await insertTournamentRoundMatch(client, {
    ownerUserId: currentMatch.tournament_owner_user_id,
    tournamentId: currentMatch.tournament_id,
    tournamentName: currentMatch.tournament_name,
    mode: currentMatch.tournament_format,
    arenaRevisionId: currentMatch.arena_revision_id,
    seedBase: currentMatch.tournament_seed_base,
    maxTicks: currentMatch.max_ticks,
    round: targetRound,
    roundSlot: targetSlot,
    participants: [
      { botRevisionId: leftWinner.bot_revision_id, teamId: "A" },
      { botRevisionId: rightWinner.bot_revision_id, teamId: "B" }
    ]
  });

  return createdMatchId ? [createdMatchId] : [];
}

async function advanceDoubleEliminationFinal(
  client: PoolClient,
  currentMatch: TournamentProgressMatchRow,
  winner: MatchParticipantOutcomeRow
): Promise<string[]> {
  if (currentMatch.round_slot !== 0) {
    return [];
  }

  const finalsRound = await getTournamentRound(client, currentMatch.tournament_id, "finals", 1);
  if (!finalsRound) {
    return [];
  }

  const resetMatch = await getRoundMatchBySlot(client, finalsRound.id, 1);
  if (resetMatch) {
    return [];
  }

  const winnersFinalRound = await client.query<{ id: string }>(
    `
      SELECT id
      FROM tournament_rounds
      WHERE tournament_id = $1
        AND bracket = 'winners'
      ORDER BY round_number DESC
      LIMIT 1
    `,
    [currentMatch.tournament_id]
  );

  const winnersFinalRoundId = winnersFinalRound.rows[0]?.id;
  if (!winnersFinalRoundId) {
    return [];
  }

  const winnersFinal = await getRoundMatchBySlot(client, winnersFinalRoundId, 0);
  if (!winnersFinal || winnersFinal.status !== "completed") {
    return [];
  }

  const winnersChampion = await getCompletedMatchWinner(client, winnersFinal.id);
  if (!winnersChampion) {
    return [];
  }

  if (winner.bot_revision_id === winnersChampion.bot_revision_id) {
    return [];
  }

  const currentParticipants = await getCompletedMatchParticipants(client, currentMatch.id);
  if (currentParticipants.length !== 2) {
    return [];
  }

  const createdMatchId = await insertTournamentRoundMatch(client, {
    ownerUserId: currentMatch.tournament_owner_user_id,
    tournamentId: currentMatch.tournament_id,
    tournamentName: currentMatch.tournament_name,
    mode: currentMatch.tournament_format,
    arenaRevisionId: currentMatch.arena_revision_id,
    seedBase: currentMatch.tournament_seed_base,
    maxTicks: currentMatch.max_ticks,
    round: finalsRound,
    roundSlot: 1,
    participants: [
      { botRevisionId: currentParticipants[0].bot_revision_id, teamId: "A" },
      { botRevisionId: currentParticipants[1].bot_revision_id, teamId: "B" }
    ],
    suffix: "Reset"
  });

  return createdMatchId ? [createdMatchId] : [];
}

export async function processTournamentMatchCompletion(database: Database, matchId: string): Promise<string[]> {
  return withTransaction(database, async (client) => {
    return processTournamentMatchCompletionWithClient(client, matchId);
  });
}

export async function processTournamentMatchCompletionWithClient(client: PoolClient, matchId: string): Promise<string[]> {
  const matchResult = await client.query<TournamentProgressMatchRow>(
    `
      SELECT
        m.id,
        m.tournament_id,
        t.owner_user_id AS tournament_owner_user_id,
        t.name AS tournament_name,
        t.format AS tournament_format,
        t.seed_base AS tournament_seed_base,
        m.tournament_round_id,
        m.round_slot,
        m.status,
        m.arena_revision_id,
        m.max_ticks,
        tr.round_number,
        tr.label AS round_label,
        tr.bracket
      FROM matches AS m
      JOIN tournaments AS t ON t.id = m.tournament_id
      JOIN tournament_rounds AS tr ON tr.id = m.tournament_round_id
      WHERE m.id = $1
    `,
    [matchId]
  );

  const currentMatch = matchResult.rows[0];
  if (!currentMatch || currentMatch.status !== "completed") {
    return [];
  }
  if (!currentMatch.tournament_owner_user_id) {
    return [];
  }

  const winner = await getCompletedMatchWinner(client, currentMatch.id);
  if (!winner) {
    return [];
  }

  if (currentMatch.tournament_format === "single-elimination") {
    if (currentMatch.bracket !== "winners") {
      return [];
    }

    const winnerRoundCount = await getWinnerRoundCount(client, currentMatch.tournament_id);
    return advanceWinnerBracketMatch(client, currentMatch, winnerRoundCount, winner);
  }

  if (currentMatch.tournament_format !== "double-elimination") {
    return [];
  }

  const winnerRoundCount = await getWinnerRoundCount(client, currentMatch.tournament_id);
  if (winnerRoundCount === 0) {
    return [];
  }

  switch (currentMatch.bracket) {
    case "winners": {
      const createdWinnerMatchIds = await advanceWinnerBracketMatch(client, currentMatch, winnerRoundCount, winner);
      const loser = await getCompletedMatchLoser(client, currentMatch.id);
      if (!loser) {
        return createdWinnerMatchIds;
      }

      const createdLoserMatchIds = await advanceDoubleEliminationWinnersLoser(client, currentMatch, loser, winnerRoundCount);
      return [...createdWinnerMatchIds, ...createdLoserMatchIds];
    }
    case "losers":
      return advanceDoubleEliminationLosersWinner(client, currentMatch, winner, winnerRoundCount);
    case "finals":
      return advanceDoubleEliminationFinal(client, currentMatch, winner);
    case "round-robin":
      return [];
  }
}
