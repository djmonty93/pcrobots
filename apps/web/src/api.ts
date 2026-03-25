export type SupportedLanguage = "javascript" | "typescript" | "python";
export type MatchMode = "live" | "queued" | "ladder" | "round-robin" | "single-elimination" | "double-elimination";
export type MatchStatus = "pending" | "queued" | "running" | "completed" | "failed";
export type TournamentFormat = "round-robin" | "single-elimination" | "double-elimination";

export interface BotRevision {
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
  latestRevision: BotRevision;
}

export interface ArenaRevision {
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
  latestRevision: ArenaRevision;
}

export interface MatchParticipant {
  id: string;
  matchId: string;
  botRevisionId: string;
  botId: string;
  botName: string;
  language: SupportedLanguage;
  source: string;
  revisionVersion: number;
  teamId: "A" | "B" | "C";
  slot: number;
}

export interface MatchEvent {
  tick: number;
  type: string;
  payload: Record<string, string | number | boolean | null>;
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
  result: {
    finished: boolean;
    winnerRobotId: string | null;
    winnerTeamId: "A" | "B" | "C" | null;
    reason: string | null;
  } | null;
  events: MatchEvent[] | null;
  createdAt: string;
  updatedAt: string;
  participants: MatchParticipant[];
}

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
  bracket: "round-robin" | "winners" | "losers" | "finals";
  roundNumber: number;
  label: string;
  createdAt: string;
  matches: MatchRecord[];
}

export interface TournamentRecord {
  id: string;
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

export interface TournamentRunResponse {
  tournament: TournamentRecord;
  count: number;
  processedMatchIds: string[];
  queued: boolean;
  jobIds?: string[];
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function listBots(): Promise<BotRecord[]> {
  return requestJson<BotRecord[]>("/api/bots");
}

export function createBot(input: {
  name: string;
  description?: string;
  language: SupportedLanguage;
  source: string;
}): Promise<BotRecord> {
  return requestJson<BotRecord>("/api/bots", {
    method: "POST",
    body: input
  });
}

export function listArenas(): Promise<ArenaRecord[]> {
  return requestJson<ArenaRecord[]>("/api/arenas");
}

export function createArena(input: { name: string; description?: string; text: string }): Promise<ArenaRecord> {
  return requestJson<ArenaRecord>("/api/arenas", {
    method: "POST",
    body: input
  });
}

export function listMatches(): Promise<MatchRecord[]> {
  return requestJson<MatchRecord[]>("/api/matches");
}

export function createMatch(input: {
  name: string;
  mode: MatchMode;
  arenaId: string;
  seed: number;
  maxTicks: number;
  enqueue: boolean;
  participants: Array<{ botId: string; teamId: "A" | "B" | "C" }>;
}): Promise<{ match: MatchRecord; run: unknown }> {
  return requestJson<{ match: MatchRecord; run: unknown }>("/api/matches", {
    method: "POST",
    body: input
  });
}

export function runMatch(matchId: string, queue: boolean): Promise<unknown> {
  return requestJson<unknown>(`/api/matches/${matchId}/run${queue ? "?queue=true" : ""}`, {
    method: "POST"
  });
}

export function listLadders(): Promise<LadderRecord[]> {
  return requestJson<LadderRecord[]>("/api/ladders");
}

export function createLadder(input: {
  name: string;
  description?: string;
  arenaId: string;
  maxTicks: number;
  entryBotIds: string[];
}): Promise<LadderRecord> {
  return requestJson<LadderRecord>("/api/ladders", {
    method: "POST",
    body: input
  });
}

export function challengeLadder(
  ladderId: string,
  input: { seed: number; enqueue: boolean; entryAId?: string; entryBId?: string }
): Promise<{ match: MatchRecord; run: unknown }> {
  return requestJson<{ match: MatchRecord; run: unknown }>(`/api/ladders/${ladderId}/challenge`, {
    method: "POST",
    body: input
  });
}

export function listTournaments(): Promise<TournamentRecord[]> {
  return requestJson<TournamentRecord[]>("/api/tournaments");
}

export function createTournament(input: {
  name: string;
  description?: string;
  format: TournamentFormat;
  arenaId: string;
  maxTicks: number;
  seedBase: number;
  entryBotIds: string[];
}): Promise<TournamentRecord> {
  return requestJson<TournamentRecord>("/api/tournaments", {
    method: "POST",
    body: input
  });
}

export function runTournamentMatches(
  tournamentId: string,
  input: { enqueue: boolean; limit?: number; roundId?: string }
): Promise<TournamentRunResponse> {
  return requestJson<TournamentRunResponse>(`/api/tournaments/${tournamentId}/run-pending`, {
    method: "POST",
    body: input
  });
}
