import { startTransition, useEffect, useMemo, useState } from "react";

import {
  changeOwnPassword,
  clearAuthToken,
  challengeLadder,
  createArena,
  createBot,
  createLadder,
  createMatch,
  createTournament,
  createUser,
  deleteArena,
  deleteBot,
  deleteUser,
  getAuthToken,
  getCurrentUser,
  login,
  listArenas,
  listBots,
  listLadders,
  listMatches,
  listTournaments,
  listUsers,
  logout,
  register,
  runTournamentMatches,
  setAuthToken,
  transferUserOwnership,
  updateArena,
  updateBot,
  updateUser,
  type ArenaRecord,
  type BotRecord,
  type LadderRecord,
  type MatchMode,
  type MatchRecord,
  type SupportedLanguage,
  type UserRecord,
  type UserRole,
  type TournamentFormat,
  type TournamentRecord
} from "./api.js";
import { CodeEditor } from "./CodeEditor.js";
import { ReplayViewer } from "./ReplayViewer.js";
import { CreatingBotsPage, RunningBotsPage } from "./DocPage.js";

const defaultBotTemplates: Record<SupportedLanguage, string> = {
  javascript: `module.exports = function onTurn(snapshot) {
  if (snapshot.tick === 0) return { kind: "scan", heading: 0, resolution: 12 };
  if (snapshot.tick === 1) return { kind: "shoot", heading: 0, range: 45 };
  return { kind: "movement", targetSpeed: 35, heading: 0 };
};
`,
  typescript: `type TurnSnapshot = {
  tick: number;
};

export = function onTurn(snapshot: TurnSnapshot) {
  if (snapshot.tick === 0) return { kind: "scan", heading: 0, resolution: 10 };
  return { kind: "movement", targetSpeed: 30, heading: 0 };
};
`,
  python: `from typing import Any

def on_turn(snapshot: dict[str, Any]):
    if snapshot["tick"] == 0:
        return {"kind": "scan", "heading": 0, "resolution": 10}
    return {"kind": "movement", "targetSpeed": 30, "heading": 0}
`,
  lua: `local function on_turn(snapshot)
  if snapshot.tick == 0 then
    return { kind = "scan", heading = 0, resolution = 10 }
  end

  return { kind = "movement", targetSpeed = 30, heading = 0 }
end

return on_turn
`,
  "linux-x64-binary": ""
};

type BotFormState = {
  name: string;
  description: string;
  language: SupportedLanguage;
  source: string;
  artifactBase64: string;
  artifactFileName: string;
  preserveExistingArtifact: boolean;
};

function isBinaryLanguage(language: SupportedLanguage): language is "linux-x64-binary" {
  return language === "linux-x64-binary";
}

function encodeBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function createSampleArenaText(): string {
  const lines = Array.from({ length: 100 }, () => ".".repeat(100));
  lines[12] = `A${".".repeat(17)}*${".".repeat(17)}R${".".repeat(62)}B`;
  lines[28] = `${".".repeat(24)}XXX${".".repeat(73)}`;
  lines[41] = `${".".repeat(10)}S${".".repeat(30)}D${".".repeat(58)}`;
  lines[74] = `${".".repeat(48)}***${".".repeat(49)}`;
  return lines.join("\n");
}

function createInitialBotState() {
  return {
    name: "Scout Alpha",
    description: "First browser-authored bot",
    language: "javascript" as SupportedLanguage,
    source: defaultBotTemplates.javascript,
    artifactBase64: "",
    artifactFileName: "",
    preserveExistingArtifact: false
  } satisfies BotFormState;
}

function createInitialArenaState() {
  return {
    name: "Foundry Floor",
    description: "Starter arena with cover and hazards",
    text: createSampleArenaText()
  };
}

function createInitialMatchState() {
  return {
    name: "Exhibition Match",
    mode: "live" as MatchMode,
    arenaId: "",
    teamABotId: "",
    teamBBotId: "",
    seed: 7,
    maxTicks: 120,
    enqueue: false
  };
}

function createInitialLadderState() {
  return {
    name: "Foundry Ladder",
    description: "Continuous rating table",
    arenaId: "",
    maxTicks: 150,
    entryBotIds: [] as string[]
  };
}

function createInitialTournamentState() {
  return {
    name: "Foundry Cup",
    description: "Scheduled competition bracket",
    format: "round-robin" as TournamentFormat,
    arenaId: "",
    maxTicks: 150,
    seedBase: 100,
    entryBotIds: [] as string[]
  };
}

function createInitialLoginState() {
  return {
    email: "",
    password: ""
  };
}

function createInitialPasswordState() {
  return {
    currentPassword: "",
    nextPassword: ""
  };
}

function createInitialUserState() {
  return {
    email: "",
    password: "",
    role: "user" as UserRole,
    isActive: true
  };
}

function toggleSelection(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function BotChecklist(props: {
  bots: BotRecord[];
  selectedBotIds: string[];
  onToggle: (botId: string) => void;
}) {
  return (
    <div className="bot-checklist">
      {props.bots.length > 0 ? (
        props.bots.map((bot) => (
          <label key={bot.id} className="bot-pill">
            <input
              type="checkbox"
              checked={props.selectedBotIds.includes(bot.id)}
              onChange={() => props.onToggle(bot.id)}
            />
            <span>{bot.name}</span>
            <small>{bot.latestRevision.language}</small>
          </label>
        ))
      ) : (
        <p className="muted">Create bots first.</p>
      )}
    </div>
  );
}

function getRoundStateCounts(tournament: TournamentRecord, roundId: string) {
  const round = tournament.rounds.find((entry) => entry.id === roundId);
  const counts = { total: 0, completed: 0, pending: 0, queued: 0, running: 0, failed: 0 };
  if (!round) {
    return counts;
  }

  for (const match of round.matches) {
    counts.total += 1;
    switch (match.status) {
      case "completed":
        counts.completed += 1;
        break;
      case "pending":
        counts.pending += 1;
        break;
      case "queued":
        counts.queued += 1;
        break;
      case "running":
        counts.running += 1;
        break;
      case "failed":
        counts.failed += 1;
        break;
    }
  }

  return counts;
}

function getTournamentStatusLine(tournament: TournamentRecord): string {
  if (tournament.summary.championBotName) {
    return `Champion: ${tournament.summary.championBotName}`;
  }

  if (tournament.summary.leaderBotName) {
    return `Leader: ${tournament.summary.leaderBotName}`;
  }

  return "No leader yet";
}

function OwnerLabel({ ownerEmail, isAdmin }: { ownerEmail: string | null; isAdmin: boolean }) {
  if (!isAdmin) return null;
  return <p className="match-meta">{ownerEmail ? `Owner: ${ownerEmail}` : "Owner: unknown"}</p>;
}

type Tab = "bots" | "arenas" | "matches" | "compete" | "accounts";

type Route = "landing" | "docs-creating-bots" | "docs-running-bots";

function routeFromPathname(path: string): Route {
  if (path === "/docs/creating-bots") return "docs-creating-bots";
  if (path === "/docs/running-bots") return "docs-running-bots";
  return "landing";
}

function StatRow(props: { chips: Array<{ label: string; value: number | string }> }) {
  return (
    <div className="stat-row">
      {props.chips.map((chip) => (
        <div key={chip.label} className="stat-chip">
          <div className="stat-chip-label">{chip.label}</div>
          <div className="stat-chip-value">{chip.value}</div>
        </div>
      ))}
    </div>
  );
}

export function App() {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [arenas, setArenas] = useState<ArenaRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [ladders, setLadders] = useState<LadderRecord[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [botForm, setBotForm] = useState<BotFormState>(createInitialBotState);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [botFilter, setBotFilter] = useState("");
  const [arenaForm, setArenaForm] = useState(createInitialArenaState);
  const [editingArenaId, setEditingArenaId] = useState<string | null>(null);
  const [arenaFilter, setArenaFilter] = useState("");
  const [matchForm, setMatchForm] = useState(createInitialMatchState);
  const [ladderForm, setLadderForm] = useState(createInitialLadderState);
  const [tournamentForm, setTournamentForm] = useState(createInitialTournamentState);
  const [loginForm, setLoginForm] = useState(createInitialLoginState);
  const [passwordForm, setPasswordForm] = useState(createInitialPasswordState);
  const [userForm, setUserForm] = useState(createInitialUserState);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [transferTargetUserId, setTransferTargetUserId] = useState("");

  // ── Routing ──────────────────────────────────────────────────────────────
  const [currentRoute, setCurrentRoute] = useState<Route>(() =>
    routeFromPathname(window.location.pathname)
  );

  function navigate(path: string): void {
    window.history.pushState(null, "", path);
    setCurrentRoute(routeFromPathname(path));
  }

  useEffect(() => {
    function handlePopState() {
      setCurrentRoute(routeFromPathname(window.location.pathname));
    }
    window.addEventListener("popstate", handlePopState);
    return () => { window.removeEventListener("popstate", handlePopState); };
  }, []);

  useEffect(() => {
    if (currentRoute === "docs-creating-bots") {
      document.title = "Creating a Bot — PCRobots";
    } else if (currentRoute === "docs-running-bots") {
      document.title = "Running a Match — PCRobots";
    } else {
      document.title = "PCRobots";
    }
  }, [currentRoute]);
  // ─────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<Tab>("bots");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    let initial: "dark" | "light" = "dark";
    try {
      initial = (localStorage.getItem('pcrobots-theme') as 'dark' | 'light' | null) ?? 'dark';
    } catch {
      // localStorage unavailable (sandboxed iframe, strict privacy settings)
    }
    document.documentElement.setAttribute('data-theme', initial);
    return initial;
  });

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('pcrobots-theme', next);
      } catch {
        // localStorage unavailable — theme change still applies for this session
      }
      return next;
    });
  }

  async function refreshData(preferredMatchId?: string, user = currentUser): Promise<void> {
    if (!user) {
      setLoading(false);
      setBots([]);
      setArenas([]);
      setMatches([]);
      setLadders([]);
      setTournaments([]);
      setUsers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextBots, nextArenas, nextMatches, nextLadders, nextTournaments, nextUsers] = await Promise.all([
        listBots(),
        listArenas(),
        listMatches(),
        listLadders(),
        listTournaments(),
        user.role === "admin" ? listUsers() : Promise.resolve([])
      ]);

      startTransition(() => {
        setCurrentUser(user);
        setUsers(nextUsers);
        setBots(nextBots);
        setArenas(nextArenas);
        setMatches(nextMatches);
        setLadders(nextLadders);
        setTournaments(nextTournaments);

        setMatchForm((current) => ({
          ...current,
          arenaId: current.arenaId || nextArenas[0]?.id || "",
          teamABotId: current.teamABotId || nextBots[0]?.id || "",
          teamBBotId: current.teamBBotId || nextBots[1]?.id || nextBots[0]?.id || ""
        }));

        setLadderForm((current) => ({
          ...current,
          arenaId: current.arenaId || nextArenas[0]?.id || "",
          entryBotIds: current.entryBotIds.length > 0 ? current.entryBotIds : nextBots.slice(0, 2).map((bot) => bot.id)
        }));

        setTournamentForm((current) => ({
          ...current,
          arenaId: current.arenaId || nextArenas[0]?.id || "",
          entryBotIds:
            current.entryBotIds.length > 0 ? current.entryBotIds : nextBots.slice(0, Math.min(4, nextBots.length)).map((bot) => bot.id)
        }));

        setSelectedMatchId(preferredMatchId ?? selectedMatchId ?? nextMatches[0]?.id ?? null);
      });
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    void getCurrentUser()
      .then(async (user) => {
        await refreshData(undefined, user);
      })
      .catch((err: unknown) => {
        const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 0;
        if (status >= 400 && status < 500) {
          clearAuthToken();
        } else {
          setError("Failed to restore session. Please reload or sign in again.");
        }
        setCurrentUser(null);
        setLoading(false);
      });
  }, []);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? null,
    [matches, selectedMatchId]
  );
  const filteredBots = useMemo(() => {
    const query = botFilter.trim().toLowerCase();
    if (!query) {
      return bots;
    }

    return bots.filter((bot) =>
      [bot.name, bot.description, bot.latestRevision.language]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [botFilter, bots]);
  const filteredArenas = useMemo(() => {
    const query = arenaFilter.trim().toLowerCase();
    if (!query) {
      return arenas;
    }

    return arenas.filter((arena) =>
      [arena.name, arena.description]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [arenaFilter, arenas]);
  const ownershipCounts = useMemo(() => {
    const counts = new Map<string, { bots: number; arenas: number; ladders: number; tournaments: number; matches: number }>();
    const ensure = (userId: string | null | undefined) => {
      if (!userId) {
        return null;
      }
      const current = counts.get(userId) ?? { bots: 0, arenas: 0, ladders: 0, tournaments: 0, matches: 0 };
      counts.set(userId, current);
      return current;
    };

    for (const bot of bots) {
      const current = ensure(bot.ownerUserId);
      if (current) {
        current.bots += 1;
      }
    }
    for (const arena of arenas) {
      const current = ensure(arena.ownerUserId);
      if (current) {
        current.arenas += 1;
      }
    }
    for (const ladder of ladders) {
      const current = ensure(ladder.ownerUserId);
      if (current) {
        current.ladders += 1;
      }
    }
    for (const tournament of tournaments) {
      const current = ensure(tournament.ownerUserId);
      if (current) {
        current.tournaments += 1;
      }
    }
    for (const match of matches) {
      const current = ensure(match.ownerUserId);
      if (current) {
        current.matches += 1;
      }
    }

    return counts;
  }, [arenas, bots, ladders, matches, tournaments]);

  function resetBotEditor(): void {
    setEditingBotId(null);
    setBotForm(createInitialBotState());
  }

  function resetArenaEditor(): void {
    setEditingArenaId(null);
    setArenaForm(createInitialArenaState());
  }

  function resetUserEditor(): void {
    setEditingUserId(null);
    setTransferTargetUserId("");
    setUserForm(createInitialUserState());
  }

  function startEditingBot(bot: BotRecord): void {
    setEditingBotId(bot.id);
    setBotForm({
      name: bot.name,
      description: bot.description,
      language: bot.latestRevision.language,
      source: bot.latestRevision.source,
      artifactBase64: "",
      artifactFileName: bot.latestRevision.artifactFileName ?? "",
      preserveExistingArtifact: bot.latestRevision.language === "linux-x64-binary"
    });
  }

  function startEditingArena(arena: ArenaRecord): void {
    setEditingArenaId(arena.id);
    setArenaForm({
      name: arena.name,
      description: arena.description,
      text: arena.latestRevision.text
    });
  }

  function duplicateBot(bot: BotRecord): void {
    setActiveTab("bots");
    setEditingBotId(null);
    setBotForm({
      name: `Copy of ${bot.name}`,
      description: bot.description,
      language: bot.latestRevision.language,
      source: bot.latestRevision.source,
      artifactBase64: "",
      artifactFileName: "",
      preserveExistingArtifact: false
    });
    setMessage(
      bot.latestRevision.language === "linux-x64-binary"
        ? `Loaded ${bot.name} metadata into the editor. Upload a Linux binary to save the copy.`
        : `Loaded ${bot.name} into the editor as a new bot copy`
    );
    setError(null);
  }

  function duplicateArena(arena: ArenaRecord): void {
    setActiveTab("arenas");
    setEditingArenaId(null);
    setArenaForm({
      name: `Copy of ${arena.name}`,
      description: arena.description,
      text: arena.latestRevision.text
    });
    setMessage(`Loaded ${arena.name} into the editor as a new arena copy`);
    setError(null);
  }

  function startEditingUser(user: UserRecord): void {
    setEditingUserId(user.id);
    setTransferTargetUserId("");
    setUserForm({
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.isActive
    });
  }

  async function handleLogin(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const session = await login(loginForm);
      setAuthToken(session.token);
      setCurrentUser(session.user);
      await refreshData(undefined, session.user);
      setMessage(`Signed in as ${session.user.email}`);
    } catch (loginError) {
      clearAuthToken();
      setCurrentUser(null);
      setError(loginError instanceof Error ? loginError.message : String(loginError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const session = await register(loginForm);
      setAuthToken(session.token);
      setCurrentUser(session.user);
      await refreshData(undefined, session.user);
      setMessage(`Created and signed into ${session.user.email}`);
    } catch (registerError) {
      clearAuthToken();
      setCurrentUser(null);
      setError(registerError instanceof Error ? registerError.message : String(registerError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await logout();
    } catch {
      // session may already be gone server-side
    } finally {
      clearAuthToken();
      setCurrentUser(null);
      setUsers([]);
      setBots([]);
      setArenas([]);
      setMatches([]);
      setLadders([]);
      setTournaments([]);
      setSelectedMatchId(null);
      setSubmitting(false);
    }
  }

  async function handleChangePassword(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await changeOwnPassword(passwordForm);
      setPasswordForm(createInitialPasswordState());
      setMessage("Updated password");
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : String(passwordError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveUser(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const savedUser = editingUserId
        ? await updateUser(editingUserId, {
            email: userForm.email,
            password: userForm.password || undefined,
            role: userForm.role,
            isActive: userForm.isActive
          })
        : await createUser(userForm);

      resetUserEditor();
      setMessage(editingUserId ? `Updated ${savedUser.email}` : `Created ${savedUser.email}`);
      await refreshData();
    } catch (userError) {
      setError(userError instanceof Error ? userError.message : String(userError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser(user: UserRecord): Promise<void> {
    if (!window.confirm(`Delete account "${user.email}"? This only works if the account does not own any resources.`)) {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await deleteUser(user.id);
      if (editingUserId === user.id) {
        resetUserEditor();
      }
      setMessage(`Deleted ${user.email}`);
      await refreshData();
    } catch (userError) {
      setError(userError instanceof Error ? userError.message : String(userError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTransferOwnership(): Promise<void> {
    if (!editingUserId || !transferTargetUserId) {
      setError("Select a destination user before transferring ownership.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const result = await transferUserOwnership(editingUserId, transferTargetUserId);
      setMessage(
        `Transferred ${result.bots} bots, ${result.arenas} arenas, ${result.ladders} ladders, ${result.tournaments} tournaments, and ${result.matches} matches`
      );
      setTransferTargetUserId("");
      await refreshData();
    } catch (transferError) {
      setError(transferError instanceof Error ? transferError.message : String(transferError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveBot(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = isBinaryLanguage(botForm.language)
        ? {
            name: botForm.name,
            description: botForm.description,
            language: botForm.language,
            artifactBase64: botForm.artifactBase64 || undefined,
            artifactFileName: botForm.artifactFileName || undefined
          }
        : {
            name: botForm.name,
            description: botForm.description,
            language: botForm.language,
            source: botForm.source
          };
      const bot = editingBotId ? await updateBot(editingBotId, payload) : await createBot(payload as Parameters<typeof createBot>[0]);
      setMessage(editingBotId ? `Updated ${bot.name}` : `Saved ${bot.name}`);
      resetBotEditor();
      await refreshData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBotArtifactSelected(file: File | null): Promise<void> {
    if (!file) {
      setBotForm((current) => ({ ...current, artifactBase64: "", artifactFileName: "", preserveExistingArtifact: Boolean(editingBotId) }));
      return;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setBotForm((current) => ({
        ...current,
        artifactBase64: encodeBytesToBase64(bytes),
        artifactFileName: file.name,
        preserveExistingArtifact: false
      }));
      setMessage(`Loaded ${file.name} for upload`);
      setError(null);
    } catch (artifactError) {
      setError(artifactError instanceof Error ? artifactError.message : String(artifactError));
    }
  }

  async function handleDeleteBot(bot: BotRecord): Promise<void> {
    if (!window.confirm(`Delete bot "${bot.name}"? This only works if it is not referenced by matches or competitions.`)) {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await deleteBot(bot.id);
      if (editingBotId === bot.id) {
        resetBotEditor();
      }
      setMessage(`Deleted ${bot.name}`);
      await refreshData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveArena(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const arena = editingArenaId ? await updateArena(editingArenaId, arenaForm) : await createArena(arenaForm);
      setMessage(editingArenaId ? `Updated arena ${arena.name}` : `Saved arena ${arena.name}`);
      resetArenaEditor();
      await refreshData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteArena(arena: ArenaRecord): Promise<void> {
    if (!window.confirm(`Delete arena "${arena.name}"? This only works if it is not referenced by matches or competitions.`)) {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await deleteArena(arena.id);
      if (editingArenaId === arena.id) {
        resetArenaEditor();
      }
      setMessage(`Deleted arena ${arena.name}`);
      await refreshData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateMatch(): Promise<void> {
    if (!matchForm.arenaId || !matchForm.teamABotId || !matchForm.teamBBotId) {
      setError("Select an arena and two bots before creating a match.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await createMatch({
        name: matchForm.name,
        mode: matchForm.mode,
        arenaId: matchForm.arenaId,
        seed: matchForm.seed,
        maxTicks: matchForm.maxTicks,
        enqueue: matchForm.enqueue,
        participants: [
          { botId: matchForm.teamABotId, teamId: "A" },
          { botId: matchForm.teamBBotId, teamId: "B" }
        ]
      });

      setMessage(matchForm.mode === "queued" || matchForm.enqueue ? "Queued match run" : "Stored and ran match");
      await refreshData(response.match.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateLadder(): Promise<void> {
    if (!ladderForm.arenaId || ladderForm.entryBotIds.length < 2) {
      setError("Pick an arena and at least two bots for the ladder.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const ladder = await createLadder(ladderForm);
      setMessage(`Created ladder ${ladder.name}`);
      await refreshData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLadderChallenge(ladderId: string): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await challengeLadder(ladderId, {
        seed: Date.now() % 100000,
        enqueue: false
      });
      setMessage("Ran ladder challenge");
      await refreshData(response.match.id);
    } catch (challengeError) {
      setError(challengeError instanceof Error ? challengeError.message : String(challengeError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateTournament(): Promise<void> {
    if (!tournamentForm.arenaId || tournamentForm.entryBotIds.length < 2) {
      setError("Pick an arena and at least two bots for the tournament.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const tournament = await createTournament(tournamentForm);
      setMessage(`Created tournament ${tournament.name}`);
      await refreshData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRunTournament(
    tournamentId: string,
    options: { enqueue: boolean; limit?: number; roundId?: string }
  ): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await runTournamentMatches(tournamentId, options);
      const actionLabel = options.enqueue ? "Enqueued" : "Ran";
      const scopeLabel = options.limit === 1 ? "next pending tournament match" : "pending tournament matches";
      setMessage(`${actionLabel} ${response.count} ${scopeLabel}`);
      await refreshData(response.processedMatchIds[0]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setSubmitting(false);
    }
  }

  // Doc pages render for all users (authenticated or not)
  if (currentRoute === "docs-creating-bots") {
    return <CreatingBotsPage onNavigate={navigate} />;
  }
  if (currentRoute === "docs-running-bots") {
    return <RunningBotsPage onNavigate={navigate} />;
  }

  // Landing page for unauthenticated users
  if (!currentUser) {
    return (
      <div className="landing-shell">
        {/* ── Left: Marketing ── */}
        <div className="landing-left">
          <div className="landing-wordmark">
            <span aria-hidden="true">🤖</span>
            <span>PCRobots</span>
          </div>

          <p className="landing-tagline">Write code. Build robots. Fight.</p>

          <p className="landing-description">
            PCRobots is a competitive programming game inspired by the classic
            DOS battle-bot arena originally created by PD Smith in the early
            1990s. You write AI code in any of 5 languages — your robot fights
            for survival against others in real time.
          </p>

          <p className="landing-attribution">
            Based on the original PCRobots by{" "}
            <a
              href="https://www.pscs.co.uk/pcrobots/index.php"
              target="_blank"
              rel="noopener noreferrer"
            >
              PD Smith
            </a>{" "}
            (early 1990s)
          </p>

          <div className="landing-chips">
            <span className="landing-chip">5 languages</span>
            <span className="landing-chip">Live replays</span>
            <span className="landing-chip">Ladders</span>
            <span className="landing-chip">Tournaments</span>
          </div>

          <div className="landing-steps">
            <div className="landing-steps-title">How to play</div>
            <div className="landing-step">
              <div className="landing-step-num">1</div>
              <div className="landing-step-body">
                <strong>Write a bot</strong>
                <span>Code your robot's AI in JavaScript, TypeScript, Python, Lua, or upload a Linux binary</span>
              </div>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">2</div>
              <div className="landing-step-body">
                <strong>Pick an arena</strong>
                <span>Choose a battlefield with walls, hazards, refuel zones, and damage traps</span>
              </div>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">3</div>
              <div className="landing-step-body">
                <strong>Battle</strong>
                <span>Run matches, climb ladder rankings, or compete in elimination tournaments</span>
              </div>
            </div>
          </div>

          <div className="landing-links">
            <a
              className="landing-link"
              href="/docs/creating-bots"
              onClick={(e) => { e.preventDefault(); navigate("/docs/creating-bots"); }}
            >
              Bot creation guide →
            </a>
            <a
              className="landing-link"
              href="/docs/running-bots"
              onClick={(e) => { e.preventDefault(); navigate("/docs/running-bots"); }}
            >
              Running a match →
            </a>
          </div>
        </div>

        {/* ── Right: Login form ── */}
        <div className="landing-right">
          <div className="landing-form-wrap">
            <section className="panel" data-testid="login-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Access</p>
                  <h2>Sign In</h2>
                </div>
              </div>
              {error ? <span className="message error">{error}</span> : null}
              {message ? <span className="message success">{message}</span> : null}
              <form onSubmit={(e) => { e.preventDefault(); void handleLogin(); }}>
                <div className="form-grid two-up">
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="button-cluster">
                  <button className="primary-button" type="submit" disabled={submitting || loading}>
                    {loading ? "Checking…" : "Sign in"}
                  </button>
                  <button className="ghost-button" type="button" onClick={() => void handleRegister()} disabled={submitting || loading}>
                    Create account
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      {/* ── Desktop Sidebar ── */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-lockup">
            <div className="logo-icon">⚡</div>
            <div>
              <div className="logo-text">PCRobots</div>
              <div className="logo-sub">Ops Deck</div>
            </div>
          </div>
        </div>
        <div className="nav-section">
          <div className="nav-section-label">Workspace</div>
          <button className={`nav-item${activeTab === 'bots' ? ' active' : ''}`} onClick={() => setActiveTab('bots')}>
            <span className="nav-icon">🤖</span> Bots
            <span className="nav-badge">{bots.length}</span>
          </button>
          <button className={`nav-item${activeTab === 'arenas' ? ' active' : ''}`} onClick={() => setActiveTab('arenas')}>
            <span className="nav-icon">🗺</span> Arenas
            <span className="nav-badge">{arenas.length}</span>
          </button>
          <button className={`nav-item${activeTab === 'matches' ? ' active' : ''}`} onClick={() => setActiveTab('matches')}>
            <span className="nav-icon">▶</span> Matches
            <span className="nav-badge">{matches.length}</span>
          </button>
          <button className={`nav-item${activeTab === 'compete' ? ' active' : ''}`} onClick={() => setActiveTab('compete')}>
            <span className="nav-icon">⚔</span> Compete
            <span className="nav-badge">{ladders.length + tournaments.length}</span>
          </button>
          <button className={`nav-item${activeTab === 'accounts' ? ' active' : ''}`} onClick={() => setActiveTab('accounts')}>
            <span className="nav-icon">👤</span> Accounts
            <span className="nav-badge">{currentUser.role === "admin" ? users.length : 1}</span>
          </button>
        </div>
        <div className="sidebar-footer">
          <div className="avatar">P</div>
          <div className="user-info">
            <div className="user-name">{currentUser.email}</div>
            <div className="user-role">{currentUser.role}</div>
          </div>
          <button className="ghost-button small-button" type="button" onClick={() => void handleLogout()} disabled={submitting}>
            Sign out
          </button>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* ── Content Wrap ── */}
      <div className="content-wrap">
        {/* Mobile top bar */}
        <div className="topbar">
          <div className="topbar-logo">
            <div className="logo-icon">⚡</div>
            <div className="logo-text">PCRobots</div>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Main content */}
        <main className="content">
          <div className="content-inner">
            <div className="status-row">
              <button className="ghost-button" type="button" onClick={() => void refreshData()} disabled={loading || submitting}>
                {loading ? 'Refreshing...' : 'Refresh data'}
              </button>
              {message ? <span className="message success">{message}</span> : null}
              {error ? <span className="message error">{error}</span> : null}
            </div>

            <section className="panel">
              <div className="card-toolbar">
                <div>
                  <p className="eyebrow">Access Scope</p>
                  <h2>{currentUser.role === "admin" ? "Admin workspace" : "User workspace"}</h2>
                  <p>
                    {currentUser.role === "admin"
                      ? "You can manage all accounts and view every stored bot, arena, match, ladder, and tournament."
                      : "You can work with your own bots and arenas, run your own test matches, and enter your own bots in competitions."}
                  </p>
                </div>
                <span className="status-pill subtle">{currentUser.email}</span>
              </div>
            </section>

            {activeTab === 'bots' && (
              <div>
                <div className="page-header">
                  <div>
                    <div className="page-title">Bots</div>
                    <div className="page-sub">Build and manage your robot fleet</div>
                  </div>
                </div>
                <StatRow chips={[
                  { label: 'Bots', value: bots.length },
                  { label: 'Arenas', value: arenas.length },
                  { label: 'Matches', value: matches.length },
                ]} />
                <div className="two-col">
                  <div>
                    {/* Bot creation panel */}
                    <section className="panel" data-testid="bot-panel">
                      <div className="panel-header">
                        <div>
                          <p className="eyebrow">Bot Lab</p>
                          <h2>{editingBotId ? "Edit Bot" : "Create Bot"}</h2>
                        </div>
                        <div className="button-cluster">
                          {editingBotId ? (
                            <button className="ghost-button" type="button" onClick={resetBotEditor} disabled={submitting}>
                              Cancel edit
                            </button>
                          ) : null}
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() => setBotForm((current) => ({ ...current, source: defaultBotTemplates[current.language] }))}
                            disabled={isBinaryLanguage(botForm.language)}
                          >
                            Load template
                          </button>
                        </div>
                      </div>
                      <div className="form-grid two-up">
                        <label>
                          <span>Name</span>
                          <input value={botForm.name} onChange={(event) => setBotForm((current) => ({ ...current, name: event.target.value }))} />
                        </label>
                        <label>
                          <span>Language</span>
                          <select
                            value={botForm.language}
                            onChange={(event) => {
                              const language = event.target.value as SupportedLanguage;
                              setBotForm((current) => ({
                                ...current,
                                language,
                                source: defaultBotTemplates[language],
                                artifactBase64: "",
                                artifactFileName: "",
                                preserveExistingArtifact: false
                              }));
                            }}
                          >
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                            <option value="python">Python</option>
                            <option value="lua">Lua</option>
                            <option value="linux-x64-binary">Linux x64 binary</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        <span>Description</span>
                        <input value={botForm.description} onChange={(event) => setBotForm((current) => ({ ...current, description: event.target.value }))} />
                      </label>
                      {isBinaryLanguage(botForm.language) ? (
                        <div className="panel inset-panel">
                          <label>
                            <span>Linux x64 executable</span>
                            <input
                              type="file"
                              accept=".bin,.out,.elf,application/octet-stream"
                              onChange={(event) => void handleBotArtifactSelected(event.target.files?.[0] ?? null)}
                            />
                          </label>
                          <p className="match-meta">
                            {botForm.artifactFileName
                              ? `Selected artifact: ${botForm.artifactFileName}`
                              : botForm.preserveExistingArtifact
                                ? "Keeping the existing uploaded binary for this bot."
                                : "Upload a Linux x64 ELF executable that reads a snapshot JSON from stdin and writes a JSON action to stdout."}
                          </p>
                        </div>
                      ) : (
                        <CodeEditor language={botForm.language} value={botForm.source} height={300} onChange={(value) => setBotForm((current) => ({ ...current, source: value }))} />
                      )}
                      <button className="primary-button" type="button" onClick={() => void handleSaveBot()} disabled={submitting}>
                        {editingBotId ? "Save bot changes" : "Save bot revision"}
                      </button>
                    </section>
                  </div>
                  <div>
                    {/* Bot catalog */}
                    <section className="panel list-panel" data-testid="bot-catalog-panel">
                      <div className="panel-header">
                        <div>
                          <p className="eyebrow">Registry</p>
                          <h2>Bot Catalog</h2>
                        </div>
                      </div>
                      <label>
                        <span>Filter bots</span>
                        <input
                          value={botFilter}
                          onChange={(event) => setBotFilter(event.target.value)}
                          placeholder="Search by name, description, or language"
                        />
                      </label>
                      <div className="scroll-list compact-list">
                        {filteredBots.length > 0 ? filteredBots.map((bot) => (
                          <article key={bot.id} className="list-card">
                            <div className="card-toolbar">
                              <div>
                              <h3>{bot.name}</h3>
                              <p>{bot.description || 'No description'}</p>
                              <OwnerLabel ownerEmail={bot.ownerEmail} isAdmin={currentUser.role === "admin"} />
                            </div>
                              <div className="button-cluster">
                                <button className="ghost-button small-button" type="button" onClick={() => duplicateBot(bot)} disabled={submitting}>
                                  Duplicate
                                </button>
                                <button className="ghost-button small-button" type="button" onClick={() => startEditingBot(bot)} disabled={submitting}>
                                  Edit
                                </button>
                                <button className="ghost-button small-button" type="button" onClick={() => void handleDeleteBot(bot)} disabled={submitting}>
                                  Delete
                                </button>
                              </div>
                            </div>
                            <span>
                              {bot.latestRevision.language} · v{bot.latestRevision.version}
                              {bot.latestRevision.artifactFileName ? ` · ${bot.latestRevision.artifactFileName}` : ""}
                            </span>
                          </article>
                        )) : <p className="muted">{bots.length > 0 ? "No bots match the current filter." : "No bots stored yet."}</p>}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'arenas' && (
              <div>
                <div className="page-header">
                  <div>
                    <div className="page-title">Arenas</div>
                    <div className="page-sub">Forge and manage battle arenas</div>
                  </div>
                </div>
                <StatRow chips={[
                  { label: 'Arenas', value: arenas.length },
                  { label: 'Bots', value: bots.length },
                  { label: 'Matches', value: matches.length },
                ]} />
                <section className="panel" data-testid="arena-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Arena Forge</p>
                      <h2>{editingArenaId ? "Edit Arena" : "Create Arena"}</h2>
                    </div>
                    <div className="button-cluster">
                      {editingArenaId ? (
                        <button className="ghost-button" type="button" onClick={resetArenaEditor} disabled={submitting}>
                          Cancel edit
                        </button>
                      ) : null}
                      <button className="ghost-button" type="button" onClick={resetArenaEditor}>
                        Reset sample
                      </button>
                    </div>
                  </div>
                  <div className="form-grid two-up">
                    <label>
                      <span>Name</span>
                      <input value={arenaForm.name} onChange={(event) => setArenaForm((current) => ({ ...current, name: event.target.value }))} />
                    </label>
                    <label>
                      <span>Description</span>
                      <input value={arenaForm.description} onChange={(event) => setArenaForm((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                  </div>
                  <CodeEditor language="arena" value={arenaForm.text} height={280} onChange={(value) => setArenaForm((current) => ({ ...current, text: value }))} />
                  <button className="primary-button" type="button" onClick={() => void handleSaveArena()} disabled={submitting}>
                    {editingArenaId ? "Save arena changes" : "Save arena"}
                  </button>
                </section>
                <section className="panel list-panel" data-testid="arena-registry-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Registry</p>
                      <h2>Existing Arenas</h2>
                    </div>
                  </div>
                  <label>
                    <span>Filter arenas</span>
                    <input
                      value={arenaFilter}
                      onChange={(event) => setArenaFilter(event.target.value)}
                      placeholder="Search by name or description"
                    />
                  </label>
                  <div className="scroll-list compact-list">
                    {filteredArenas.length > 0 ? filteredArenas.map((arena) => (
                      <article key={arena.id} className="list-card">
                        <div className="card-toolbar">
                          <div>
                            <h3>{arena.name}</h3>
                            <p>{arena.description || 'No description'}</p>
                            <OwnerLabel ownerEmail={arena.ownerEmail} isAdmin={currentUser.role === "admin"} />
                          </div>
                          <div className="button-cluster">
                            <button className="ghost-button small-button" type="button" onClick={() => duplicateArena(arena)} disabled={submitting}>
                              Duplicate
                            </button>
                            <button className="ghost-button small-button" type="button" onClick={() => startEditingArena(arena)} disabled={submitting}>
                              Edit
                            </button>
                            <button className="ghost-button small-button" type="button" onClick={() => void handleDeleteArena(arena)} disabled={submitting}>
                              Delete
                            </button>
                          </div>
                        </div>
                        <span>Revision v{arena.latestRevision.version}</span>
                      </article>
                    )) : <p className="muted">{arenas.length > 0 ? "No arenas match the current filter." : "No arenas stored yet."}</p>}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'matches' && (
              <div>
                <div className="page-header">
                  <div>
                    <div className="page-title">Matches</div>
                    <div className="page-sub">Launch, replay, and review matches</div>
                  </div>
                </div>
                <StatRow chips={[
                  { label: 'Total', value: matches.length },
                  { label: 'Completed', value: matches.filter((m) => m.status === 'completed').length },
                  { label: 'Active', value: matches.filter((m) => m.status === 'running' || m.status === 'queued').length },
                ]} />
                <section className="panel" data-testid="match-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Operations</p>
                      <h2>Launch Match</h2>
                    </div>
                    <span className="status-pill subtle">API-backed</span>
                  </div>
                  <div className="form-grid three-up">
                    <label>
                      <span>Name</span>
                      <input value={matchForm.name} onChange={(event) => setMatchForm((current) => ({ ...current, name: event.target.value }))} />
                    </label>
                    <label>
                      <span>Mode</span>
                      <select
                        value={matchForm.mode}
                        onChange={(event) => setMatchForm((current) => ({ ...current, mode: event.target.value as MatchMode, enqueue: event.target.value === 'queued' }))}
                      >
                        <option value="live">Live</option>
                        <option value="queued">Queued</option>
                        <option value="ladder">Ladder</option>
                        <option value="round-robin">Round-robin</option>
                        <option value="single-elimination">Single elimination</option>
                        <option value="double-elimination">Double elimination</option>
                      </select>
                    </label>
                    <label>
                      <span>Arena</span>
                      <select value={matchForm.arenaId} onChange={(event) => setMatchForm((current) => ({ ...current, arenaId: event.target.value }))}>
                        <option value="">Select arena</option>
                        {arenas.map((arena) => <option key={arena.id} value={arena.id}>{arena.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="form-grid two-up">
                    <label>
                      <span>Team A bot</span>
                      <select value={matchForm.teamABotId} onChange={(event) => setMatchForm((current) => ({ ...current, teamABotId: event.target.value }))}>
                        <option value="">Select bot</option>
                        {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name} ({bot.latestRevision.language})</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Team B bot</span>
                      <select value={matchForm.teamBBotId} onChange={(event) => setMatchForm((current) => ({ ...current, teamBBotId: event.target.value }))}>
                        <option value="">Select bot</option>
                        {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name} ({bot.latestRevision.language})</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="form-grid three-up">
                    <label>
                      <span>Seed</span>
                      <input type="number" value={matchForm.seed} onChange={(event) => setMatchForm((current) => ({ ...current, seed: Number(event.target.value) }))} />
                    </label>
                    <label>
                      <span>Max ticks</span>
                      <input type="number" value={matchForm.maxTicks} onChange={(event) => setMatchForm((current) => ({ ...current, maxTicks: Number(event.target.value) }))} />
                    </label>
                    <label className="checkbox-row">
                      <span>Queue execution</span>
                      <input type="checkbox" checked={matchForm.enqueue} onChange={(event) => setMatchForm((current) => ({ ...current, enqueue: event.target.checked }))} />
                    </label>
                  </div>
                  <button className="primary-button" type="button" onClick={() => void handleCreateMatch()} disabled={submitting}>
                    {matchForm.enqueue || matchForm.mode === 'queued' ? 'Store and enqueue' : 'Store and run now'}
                  </button>
                </section>
                <ReplayViewer match={selectedMatch} />
                <section className="panel list-panel" data-testid="stored-matches-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Runs</p>
                      <h2>Stored Matches</h2>
                    </div>
                  </div>
                  <div className="scroll-list compact-list">
                    {matches.length > 0 ? matches.map((match) => (
                      <button key={match.id} className={`match-list-card${selectedMatchId === match.id ? ' active' : ''}`} type="button" onClick={() => setSelectedMatchId(match.id)}>
                        <span className="match-title">{match.name}</span>
                        <span className="match-meta">{match.participants.map((p) => p.botName).join(' vs ')}</span>
                        <span className="match-meta">{match.status} · {match.mode}</span>
                        <OwnerLabel ownerEmail={match.ownerEmail ?? null} isAdmin={currentUser.role === "admin"} />
                      </button>
                    )) : <p className="muted">No matches stored yet.</p>}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'compete' && (
              <div>
                <div className="page-header">
                  <div>
                    <div className="page-title">Compete</div>
                    <div className="page-sub">Ladders, tournaments, and standings</div>
                  </div>
                </div>
                <StatRow chips={[
                  { label: 'Ladders', value: ladders.length },
                  { label: 'Tournaments', value: tournaments.length },
                  { label: 'Bots', value: bots.length },
                ]} />
                <section className="panel" data-testid="ladder-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Ranked Play</p>
                      <h2>Create Ladder</h2>
                    </div>
                  </div>
                  <div className="form-grid two-up">
                    <label>
                      <span>Name</span>
                      <input value={ladderForm.name} onChange={(event) => setLadderForm((current) => ({ ...current, name: event.target.value }))} />
                    </label>
                    <label>
                      <span>Arena</span>
                      <select value={ladderForm.arenaId} onChange={(event) => setLadderForm((current) => ({ ...current, arenaId: event.target.value }))}>
                        <option value="">Select arena</option>
                        {arenas.map((arena) => <option key={arena.id} value={arena.id}>{arena.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <label>
                    <span>Description</span>
                    <input value={ladderForm.description} onChange={(event) => setLadderForm((current) => ({ ...current, description: event.target.value }))} />
                  </label>
                  <label>
                    <span>Max ticks</span>
                    <input type="number" value={ladderForm.maxTicks} onChange={(event) => setLadderForm((current) => ({ ...current, maxTicks: Number(event.target.value) }))} />
                  </label>
                  <BotChecklist bots={bots} selectedBotIds={ladderForm.entryBotIds} onToggle={(botId) => setLadderForm((current) => ({ ...current, entryBotIds: toggleSelection(current.entryBotIds, botId) }))} />
                  <button className="primary-button" type="button" onClick={() => void handleCreateLadder()} disabled={submitting}>
                    Create ladder
                  </button>
                  <div className="scroll-list competition-list">
                    {ladders.length > 0 ? ladders.map((ladder) => (
                      <article key={ladder.id} className="list-card">
                        <div className="card-toolbar">
                          <div>
                            <h3>{ladder.name}</h3>
                            <p>{ladder.description || 'No description'}</p>
                            <OwnerLabel ownerEmail={ladder.ownerEmail} isAdmin={currentUser.role === "admin"} />
                          </div>
                          <button className="ghost-button small-button" type="button" onClick={() => void handleLadderChallenge(ladder.id)} disabled={submitting || ladder.entries.length < 2}>
                            Challenge top pair
                          </button>
                        </div>
                        <p className="match-meta">{ladder.arenaName} · {ladder.entries.length} entries</p>
                        <ol className="standing-list">
                          {ladder.standings.slice(0, 4).map((standing) => (
                            <li key={standing.ladderEntryId}>
                              <span>{standing.botName}</span>
                              <span>{standing.rating}</span>
                              <small>{standing.wins}-{standing.losses}-{standing.draws}</small>
                            </li>
                          ))}
                        </ol>
                      </article>
                    )) : <p className="muted">No ladders yet.</p>}
                  </div>
                </section>

                <section className="panel" data-testid="tournament-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Events</p>
                      <h2>Create Tournament</h2>
                    </div>
                  </div>
                  <div className="form-grid three-up">
                    <label>
                      <span>Name</span>
                      <input value={tournamentForm.name} onChange={(event) => setTournamentForm((current) => ({ ...current, name: event.target.value }))} />
                    </label>
                    <label>
                      <span>Format</span>
                      <select value={tournamentForm.format} onChange={(event) => setTournamentForm((current) => ({ ...current, format: event.target.value as TournamentFormat }))}>
                        <option value="round-robin">Round-robin</option>
                        <option value="single-elimination">Single elimination</option>
                        <option value="double-elimination">Double elimination</option>
                      </select>
                    </label>
                    <label>
                      <span>Arena</span>
                      <select value={tournamentForm.arenaId} onChange={(event) => setTournamentForm((current) => ({ ...current, arenaId: event.target.value }))}>
                        <option value="">Select arena</option>
                        {arenas.map((arena) => <option key={arena.id} value={arena.id}>{arena.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <label>
                    <span>Description</span>
                    <input value={tournamentForm.description} onChange={(event) => setTournamentForm((current) => ({ ...current, description: event.target.value }))} />
                  </label>
                  <div className="form-grid two-up">
                    <label>
                      <span>Max ticks</span>
                      <input type="number" value={tournamentForm.maxTicks} onChange={(event) => setTournamentForm((current) => ({ ...current, maxTicks: Number(event.target.value) }))} />
                    </label>
                    <label>
                      <span>Seed base</span>
                      <input type="number" value={tournamentForm.seedBase} onChange={(event) => setTournamentForm((current) => ({ ...current, seedBase: Number(event.target.value) }))} />
                    </label>
                  </div>
                  <BotChecklist bots={bots} selectedBotIds={tournamentForm.entryBotIds} onToggle={(botId) => setTournamentForm((current) => ({ ...current, entryBotIds: toggleSelection(current.entryBotIds, botId) }))} />
                  <button className="primary-button" type="button" onClick={() => void handleCreateTournament()} disabled={submitting}>
                    Create tournament
                  </button>
                  <div className="scroll-list competition-list">
                    {tournaments.length > 0 ? tournaments.map((tournament) => (
                      <article key={tournament.id} className="list-card">
                        <div className="card-toolbar">
                          <div>
                            <h3>{tournament.name}</h3>
                            <p>{tournament.description || 'No description'}</p>
                            <OwnerLabel ownerEmail={tournament.ownerEmail} isAdmin={currentUser.role === "admin"} />
                          </div>
                          <div className="button-cluster">
                            <button className="ghost-button small-button" type="button" onClick={() => void handleRunTournament(tournament.id, { enqueue: false, limit: 1 })} disabled={submitting || tournament.summary.pendingMatches === 0}>Run next</button>
                            <button className="ghost-button small-button" type="button" onClick={() => void handleRunTournament(tournament.id, { enqueue: false })} disabled={submitting || tournament.summary.pendingMatches === 0}>Run all now</button>
                            <button className="ghost-button small-button" type="button" onClick={() => void handleRunTournament(tournament.id, { enqueue: true })} disabled={submitting || tournament.summary.pendingMatches === 0}>Enqueue pending</button>
                          </div>
                        </div>
                        <p className="match-meta">{tournament.format} · {tournament.entries.length} entrants · {tournament.arenaName}</p>
                        <div className="summary-grid">
                          <div className="summary-chip"><strong>{tournament.summary.completedMatches}/{tournament.summary.totalMatches}</strong><small>completed</small></div>
                          <div className="summary-chip"><strong>{tournament.summary.pendingMatches}</strong><small>pending</small></div>
                          <div className="summary-chip"><strong>{tournament.summary.queuedMatches + tournament.summary.runningMatches}</strong><small>active</small></div>
                          <div className="summary-chip"><strong>{tournament.summary.failedMatches}</strong><small>failed</small></div>
                        </div>
                        <p className="leader-line">{getTournamentStatusLine(tournament)}</p>
                        <ol className="standing-list compact-standing-list">
                          {tournament.standings.slice(0, 4).map((standing) => (
                            <li key={standing.tournamentEntryId}>
                              <span>#{standing.seed} {standing.botName}</span>
                              <span>{tournament.format === 'round-robin' ? String(standing.points) + ' pts' : standing.eliminated ? 'out' : 'alive'}</span>
                              <small>{standing.wins}-{standing.losses}-{standing.draws}</small>
                            </li>
                          ))}
                        </ol>
                        <div className="round-summary-list">
                          {tournament.rounds.slice(0, 6).map((round) => {
                            const counts = getRoundStateCounts(tournament, round.id);
                            return (
                              <div key={round.id} className="round-summary-item">
                                <span>{round.label}</span>
                                <small>{counts.completed}/{counts.total} complete · {counts.pending} pending</small>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    )) : <p className="muted">No tournaments yet.</p>}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'accounts' && (
              <div>
                <div className="page-header">
                  <div>
                    <div className="page-title">Accounts</div>
                    <div className="page-sub">Session and user management</div>
                  </div>
                </div>
                <StatRow chips={[
                  { label: 'Signed in as', value: currentUser.email },
                  { label: 'Role', value: currentUser.role },
                  { label: 'Managed users', value: currentUser.role === 'admin' ? users.length : 1 },
                ]} />
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Security</p>
                      <h2>Change Password</h2>
                    </div>
                  </div>
                  <div className="form-grid two-up">
                    <label>
                      <span>Current password</span>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span>New password</span>
                      <input
                        type="password"
                        value={passwordForm.nextPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))}
                      />
                    </label>
                  </div>
                  <button className="primary-button" type="button" onClick={() => void handleChangePassword()} disabled={submitting}>
                    Update password
                  </button>
                </section>

                {currentUser.role === 'admin' ? (
                  <section className="panel" data-testid="admin-users-panel">
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">Administration</p>
                        <h2>{editingUserId ? 'Edit Account' : 'Create Account'}</h2>
                      </div>
                      {editingUserId ? (
                        <button className="ghost-button small-button" type="button" onClick={resetUserEditor} disabled={submitting}>
                          Cancel edit
                        </button>
                      ) : null}
                    </div>
                    <div className="form-grid two-up">
                      <label>
                        <span>Email</span>
                        <input value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} />
                      </label>
                      <label>
                        <span>Password {editingUserId ? '(leave blank to keep current)' : ''}</span>
                        <input
                          type="password"
                          value={userForm.password}
                          onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="form-grid two-up">
                      <label>
                        <span>Role</span>
                        <select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as UserRole }))}>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <label className="checkbox-row">
                        <span>Active</span>
                        <input
                          type="checkbox"
                          checked={userForm.isActive}
                          onChange={(event) => setUserForm((current) => ({ ...current, isActive: event.target.checked }))}
                        />
                      </label>
                    </div>
                    {editingUserId ? (
                      <div className="form-grid two-up">
                        <label>
                          <span>Transfer owned resources to</span>
                          <select value={transferTargetUserId} onChange={(event) => setTransferTargetUserId(event.target.value)}>
                            <option value="">Select destination user</option>
                            {users
                              .filter((user) => user.id !== editingUserId)
                              .map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
                          </select>
                        </label>
                        <div className="button-cluster">
                          <button className="ghost-button" type="button" onClick={() => void handleTransferOwnership()} disabled={submitting || !transferTargetUserId}>
                            Transfer ownership
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <button className="primary-button" type="button" onClick={() => void handleSaveUser()} disabled={submitting}>
                      {editingUserId ? 'Save account' : 'Create account'}
                    </button>
                    <div className="scroll-list compact-list">
                      {users.map((user) => (
                        <article key={user.id} className="list-card">
                          <div className="card-toolbar">
                            <div>
                              <h3>{user.email}</h3>
                              <p>{user.role} · {user.isActive ? 'active' : 'inactive'}</p>
                              {(() => {
                                const counts = ownershipCounts.get(user.id) ?? { bots: 0, arenas: 0, ladders: 0, tournaments: 0, matches: 0 };
                                return (
                                  <p className="match-meta">
                                    {counts.bots} bots · {counts.arenas} arenas · {counts.ladders} ladders · {counts.tournaments} tournaments · {counts.matches} matches
                                  </p>
                                );
                              })()}
                            </div>
                            <button className="ghost-button small-button" type="button" onClick={() => startEditingUser(user)} disabled={submitting}>
                              Edit
                            </button>
                            <button
                              className="ghost-button small-button"
                              type="button"
                              onClick={() => void handleDeleteUser(user)}
                              disabled={submitting || user.id === currentUser.id}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            <button className={`bottom-nav-item${activeTab === 'bots' ? ' active' : ''}`} onClick={() => setActiveTab('bots')}>
              <span className="nav-icon">🤖</span>Bots
            </button>
            <button className={`bottom-nav-item${activeTab === 'arenas' ? ' active' : ''}`} onClick={() => setActiveTab('arenas')}>
              <span className="nav-icon">🗺</span>Arenas
            </button>
            <button className={`bottom-nav-item${activeTab === 'matches' ? ' active' : ''}`} onClick={() => setActiveTab('matches')}>
              <span className="nav-icon">▶</span>Matches
            </button>
            <button className={`bottom-nav-item${activeTab === 'compete' ? ' active' : ''}`} onClick={() => setActiveTab('compete')}>
              <span className="nav-icon">⚔</span>Compete
            </button>
            <button className={`bottom-nav-item${activeTab === 'accounts' ? ' active' : ''}`} onClick={() => setActiveTab('accounts')}>
              <span className="nav-icon">👤</span>Accounts
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
