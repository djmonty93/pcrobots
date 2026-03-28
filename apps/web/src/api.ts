export type SupportedLanguage = "javascript" | "typescript" | "python" | "lua" | "linux-x64-binary";
export type MatchMode = "live" | "queued" | "ladder" | "round-robin" | "single-elimination" | "double-elimination";
export type MatchStatus = "pending" | "queued" | "running" | "completed" | "failed";
export type TournamentFormat = "round-robin" | "single-elimination" | "double-elimination";
export type UserRole = "admin" | "user";
export type BotStatsMode = "per-bot" | "per-variant" | "reset-on-variant";

const authStorageKey = "pcrobots-auth-token";

function readStorage(kind: "sessionStorage" | "localStorage", key: string): string | null {
  try {
    return window[kind].getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(kind: "sessionStorage" | "localStorage", key: string, value: string): void {
  try {
    window[kind].setItem(key, value);
  } catch {
    // storage unavailable
  }
}

function removeStorage(kind: "sessionStorage" | "localStorage", key: string): void {
  try {
    window[kind].removeItem(key);
  } catch {
    // storage unavailable
  }
}

export interface UserRecord {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
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

export interface BotRevision {
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

export interface BotStatsBucket {
  id: string;
  botId: string;
  botRevisionId: string | null;
  scope: "bot" | "revision";
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
  latestRevision: BotRevision;
  statsBuckets: BotStatsBucket[];
  activeStats: BotStatsBucket;
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
  ownerUserId: string | null;
  ownerEmail: string | null;
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
  artifactFileName: string | null;
  artifactSha256: string | null;
  artifactSizeBytes: number | null;
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
  ownerUserId: string | null;
  ownerEmail: string | null;
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
  language: SupportedLanguage;
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
  language: SupportedLanguage;
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

export function getAuthToken(): string | null {
  const sessionToken = readStorage("sessionStorage", authStorageKey);
  if (sessionToken) {
    return sessionToken;
  }

  const legacyToken = readStorage("localStorage", authStorageKey);
  if (legacyToken) {
    writeStorage("sessionStorage", authStorageKey, legacyToken);
    removeStorage("localStorage", authStorageKey);
  }

  return legacyToken;
}

export function setAuthToken(token: string): void {
  writeStorage("sessionStorage", authStorageKey, token);
  removeStorage("localStorage", authStorageKey);
}

export function clearAuthToken(): void {
  removeStorage("sessionStorage", authStorageKey);
  removeStorage("localStorage", authStorageKey);
}

export type BotInput =
  | {
      name: string;
      description?: string;
      statsMode?: BotStatsMode;
      language: Exclude<SupportedLanguage, "linux-x64-binary">;
      source: string;
    }
  | {
      name: string;
      description?: string;
      statsMode?: BotStatsMode;
      language: "linux-x64-binary";
      artifactBase64: string;
      artifactFileName: string;
    };

export type UpdateBotInput =
  | {
      name: string;
      description?: string;
      statsMode?: BotStatsMode;
      language: Exclude<SupportedLanguage, "linux-x64-binary">;
      source: string;
    }
  | {
      name: string;
      description?: string;
      statsMode?: BotStatsMode;
      language: "linux-x64-binary";
      artifactBase64?: string;
      artifactFileName?: string;
    };

export interface ArenaInput {
  name: string;
  description?: string;
  text: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const authToken = getAuthToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      "content-type": "application/json"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const message = await response.text();
    const err = new Error(message || `Request failed with status ${response.status}`) as Error & { status: number };
    err.status = response.status;
    throw err;
  }

  return (await response.json()) as T;
}

export function login(input: { email: string; password: string }): Promise<AuthSession> {
  return requestJson<AuthSession>("/api/auth/login", {
    method: "POST",
    body: input
  });
}

export function register(input: { email: string; password: string }): Promise<AuthSession> {
  return requestJson<AuthSession>("/api/auth/register", {
    method: "POST",
    body: input
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/api/auth/logout", {
    method: "POST"
  });
}

export function getCurrentUser(): Promise<UserRecord> {
  return requestJson<UserRecord>("/api/auth/me");
}

export function changeOwnPassword(input: { currentPassword: string; nextPassword: string }): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/api/auth/me/password", {
    method: "PUT",
    body: input
  });
}

export function listUsers(): Promise<UserRecord[]> {
  return requestJson<UserRecord[]>("/api/users");
}

export function createUser(input: {
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}): Promise<UserRecord> {
  return requestJson<UserRecord>("/api/users", {
    method: "POST",
    body: input
  });
}

export function updateUser(
  userId: string,
  input: { email?: string; password?: string; role?: UserRole; isActive?: boolean }
): Promise<UserRecord> {
  return requestJson<UserRecord>(`/api/users/${userId}`, {
    method: "PUT",
    body: input
  });
}

export function deleteUser(userId: string): Promise<{ deleted: boolean; id: string }> {
  return requestJson<{ deleted: boolean; id: string }>(`/api/users/${userId}`, {
    method: "DELETE"
  });
}

export function transferUserOwnership(
  userId: string,
  targetUserId: string
): Promise<OwnershipTransferResult> {
  return requestJson<OwnershipTransferResult>(`/api/users/${userId}/transfer-ownership`, {
    method: "POST",
    body: { targetUserId }
  });
}

export function listBots(): Promise<BotRecord[]> {
  return requestJson<BotRecord[]>("/api/bots");
}

export function createBot(input: BotInput): Promise<BotRecord> {
  return requestJson<BotRecord>("/api/bots", {
    method: "POST",
    body: input
  });
}

export function updateBot(botId: string, input: UpdateBotInput): Promise<BotRecord> {
  return requestJson<BotRecord>(`/api/bots/${botId}`, {
    method: "PUT",
    body: input
  });
}

export function deleteBot(botId: string): Promise<{ deleted: boolean; id: string }> {
  return requestJson<{ deleted: boolean; id: string }>(`/api/bots/${botId}`, {
    method: "DELETE"
  });
}

export function listArenas(): Promise<ArenaRecord[]> {
  return requestJson<ArenaRecord[]>("/api/arenas");
}

export function createArena(input: ArenaInput): Promise<ArenaRecord> {
  return requestJson<ArenaRecord>("/api/arenas", {
    method: "POST",
    body: input
  });
}

export function updateArena(arenaId: string, input: ArenaInput): Promise<ArenaRecord> {
  return requestJson<ArenaRecord>(`/api/arenas/${arenaId}`, {
    method: "PUT",
    body: input
  });
}

export function deleteArena(arenaId: string): Promise<{ deleted: boolean; id: string }> {
  return requestJson<{ deleted: boolean; id: string }>(`/api/arenas/${arenaId}`, {
    method: "DELETE"
  });
}

export type MatchRunResponse =
  | { queued: true; matchId: string; jobId: string; status: "queued" }
  | { queued: false; match: MatchRecord };

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
}): Promise<{ match: MatchRecord; run: MatchRunResponse }> {
  return requestJson<{ match: MatchRecord; run: MatchRunResponse }>("/api/matches", {
    method: "POST",
    body: input
  });
}

export function runMatch(matchId: string, queue: boolean): Promise<MatchRunResponse> {
  return requestJson<MatchRunResponse>(`/api/matches/${matchId}/run${queue ? "?queue=true" : ""}`, {
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
): Promise<{ match: MatchRecord; run: MatchRunResponse }> {
  return requestJson<{ match: MatchRecord; run: MatchRunResponse }>(`/api/ladders/${ladderId}/challenge`, {
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
