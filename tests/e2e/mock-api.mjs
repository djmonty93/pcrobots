import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.env.PORT ?? "3101");
const adminEmail = process.env.PCROBOTS_ADMIN_EMAIL ?? "admin@pcrobots.local";
const adminPassword = process.env.PCROBOTS_ADMIN_PASSWORD ?? "change-me-admin-password";

const users = [];
const sessions = new Map();
const bots = [];
const arenas = [];
const matches = [];

function nowIso() {
  return new Date().toISOString();
}

function createUserRecord({ email, password, role = "user", isActive = true }) {
  const now = nowIso();
  return {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    password,
    role,
    isActive,
    createdAt: now,
    updatedAt: now
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function getOwnerEmail(ownerUserId) {
  return users.find((user) => user.id === ownerUserId)?.email ?? null;
}

function createSession(user) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  sessions.set(token, user.id);
  return {
    token,
    expiresAt,
    user: toPublicUser(user)
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type"
  });
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function getSessionUser(request) {
  const header = request.headers.authorization ?? "";
  const [scheme, token] = header.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  const userId = sessions.get(token);
  if (!userId) {
    return null;
  }

  return users.find((user) => user.id === userId) ?? null;
}

function requireUser(request, response) {
  const user = getSessionUser(request);
  if (!user) {
    sendJson(response, 401, { error: "authentication required" });
    return null;
  }

  return user;
}

function requireAdmin(request, response) {
  const user = requireUser(request, response);
  if (!user) {
    return null;
  }

  if (user.role !== "admin") {
    sendJson(response, 403, { error: "admin access required" });
    return null;
  }

  return user;
}

function listScopedResources(collection, user) {
  return user.role === "admin" ? collection : collection.filter((entry) => entry.ownerUserId === user.id);
}

function createFakeEvents(teamABotId, teamBBotId) {
  return [
    { tick: 0, type: "robot.spawned", payload: { robotId: teamABotId, teamId: "A", x: 1200, y: 1400 } },
    { tick: 0, type: "robot.spawned", payload: { robotId: teamBBotId, teamId: "B", x: 8600, y: 1400 } },
    { tick: 1, type: "robot.moved", payload: { robotId: teamABotId, x: 1800, y: 1400 } },
    { tick: 1, type: "robot.moved", payload: { robotId: teamBBotId, x: 8000, y: 1400 } },
    { tick: 2, type: "match.finished", payload: { reason: "mock-complete", winnerTeamId: "A", winnerRobotId: teamABotId } }
  ];
}

function createBotRecord(body, ownerUserId) {
  const now = nowIso();
  const id = randomUUID();
  const statsMode = body.statsMode ?? "per-bot";
  const activeStats = {
    id: `pending:${id}:${statsMode === "per-bot" ? "bot" : "revision"}`,
    botId: id,
    botRevisionId: statsMode === "per-bot" ? null : `${id}-revision`,
    scope: statsMode === "per-bot" ? "bot" : "revision",
    revisionVersion: statsMode === "per-bot" ? null : 1,
    label: statsMode === "per-bot" ? "All variants" : "v1",
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    shotsFired: 0,
    shotsLanded: 0,
    directHits: 0,
    scans: 0,
    kills: 0,
    deaths: 0,
    damageGiven: 0,
    damageTaken: 0,
    collisions: 0,
    winRatePct: 0,
    hitRatePct: 0,
    survivalRatePct: 0,
    lastMatchAt: null,
    createdAt: now,
    updatedAt: now
  };
  return {
    id,
    ownerUserId,
    ownerEmail: getOwnerEmail(ownerUserId),
    name: body.name,
    description: body.description ?? "",
    statsMode,
    createdAt: now,
    updatedAt: now,
    latestRevision: {
      id: randomUUID(),
      botId: id,
      language: body.language,
      source: body.source ?? "",
      artifactFileName: body.artifactFileName ?? null,
      artifactSha256: null,
      artifactSizeBytes: null,
      version: 1,
      createdAt: now
    },
    statsBuckets: [activeStats],
    activeStats
  };
}

function createArenaRecord(body, ownerUserId) {
  const now = nowIso();
  const id = randomUUID();
  return {
    id,
    ownerUserId,
    ownerEmail: getOwnerEmail(ownerUserId),
    name: body.name,
    description: body.description ?? "",
    createdAt: now,
    updatedAt: now,
    latestRevision: {
      id: randomUUID(),
      arenaId: id,
      text: body.text,
      version: 1,
      createdAt: now
    }
  };
}

function createMatchRecord({ name, mode, arena, participants, ownerUserId }) {
  const now = nowIso();
  const teamABotId = participants[0]?.botId ?? "alpha";
  const teamBBotId = participants[1]?.botId ?? "beta";
  const matchId = randomUUID();
  return {
    id: matchId,
    ownerUserId,
    ownerEmail: getOwnerEmail(ownerUserId),
    name,
    mode,
    status: "completed",
    arenaRevisionId: arena.latestRevision.id,
    arenaId: arena.id,
    arenaName: arena.name,
    arenaText: arena.latestRevision.text,
    seed: 7,
    maxTicks: 40,
    errorMessage: null,
    result: {
      finished: true,
      winnerRobotId: teamABotId,
      winnerTeamId: "A",
      reason: "mock-complete"
    },
    events: createFakeEvents(teamABotId, teamBBotId),
    createdAt: now,
    updatedAt: now,
    participants: participants.map((participant, index) => {
      const bot = bots.find((entry) => entry.id === participant.botId);
      return {
        id: randomUUID(),
        matchId,
        botRevisionId: bot?.latestRevision.id ?? randomUUID(),
        botId: bot?.id ?? participant.botId,
        botName: bot?.name ?? `Bot ${index + 1}`,
        language: bot?.latestRevision.language ?? "javascript",
        source: bot?.latestRevision.source ?? "",
        artifactFileName: bot?.latestRevision.artifactFileName ?? null,
        artifactSha256: bot?.latestRevision.artifactSha256 ?? null,
        artifactSizeBytes: bot?.latestRevision.artifactSizeBytes ?? null,
        revisionVersion: bot?.latestRevision.version ?? 1,
        teamId: participant.teamId,
        slot: index
      };
    })
  };
}

users.push(createUserRecord({ email: adminEmail, password: adminPassword, role: "admin", isActive: true }));

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && path === "/health") {
    sendJson(response, 200, { ok: true, name: "pcrobots-mock-api" });
    return;
  }

  try {
    if (request.method === "POST" && path === "/api/auth/register") {
      const body = await parseBody(request);
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (!email || !password) {
        sendJson(response, 400, { error: "email and password are required" });
        return;
      }
      if (users.some((user) => user.email === email)) {
        sendJson(response, 409, { error: `User ${email} already exists` });
        return;
      }

      const user = createUserRecord({ email, password, role: "user", isActive: true });
      users.push(user);
      sendJson(response, 201, createSession(user));
      return;
    }

    if (request.method === "POST" && path === "/api/auth/login") {
      const body = await parseBody(request);
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const user = users.find((entry) => entry.email === email && entry.password === password && entry.isActive);
      if (!user) {
        sendJson(response, 401, { error: "invalid email or password" });
        return;
      }

      sendJson(response, 200, createSession(user));
      return;
    }

    if (request.method === "POST" && path === "/api/auth/logout") {
      const header = request.headers.authorization ?? "";
      const [, token] = header.split(/\s+/, 2);
      if (token) {
        sessions.delete(token);
      }
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && path === "/api/auth/me") {
      const user = requireUser(request, response);
      if (!user) {
        return;
      }
      sendJson(response, 200, toPublicUser(user));
      return;
    }

    if (request.method === "PUT" && path === "/api/auth/me/password") {
      const user = requireUser(request, response);
      if (!user) {
        return;
      }
      const body = await parseBody(request);
      if (String(body.currentPassword ?? "") !== user.password) {
        sendJson(response, 401, { error: "current password is incorrect" });
        return;
      }
      user.password = String(body.nextPassword ?? "");
      user.updatedAt = nowIso();
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && path === "/api/bots") {
      const user = requireUser(request, response);
      if (!user) {
        return;
      }
      sendJson(response, 200, listScopedResources(bots, user));
      return;
    }

    if (request.method === "POST" && path === "/api/bots") {
      const user = requireUser(request, response);
      if (!user) {
        return;
      }
      const body = await parseBody(request);
      const record = createBotRecord(body, user.id);
      bots.unshift(record);
      sendJson(response, 201, record);
      return;
    }

    if (request.method === "GET" && path === "/api/arenas") {
      const user = requireUser(request, response);
      if (!user) {
        return;
      }
      sendJson(response, 200, listScopedResources(arenas, user));
      return;
    }

    if (request.method === "POST" && path === "/api/arenas") {
      const user = requireUser(request, response);
      if (!user) {
        return;
      }
      const body = await parseBody(request);
      const record = createArenaRecord(body, user.id);
      arenas.unshift(record);
      sendJson(response, 201, record);
      return;
    }

    if (request.method === "GET" && path === "/api/matches") {
      const user = requireUser(request, response);
      if (!user) {
        return;
      }
      sendJson(response, 200, listScopedResources(matches, user));
      return;
    }

    if (request.method === "POST" && path === "/api/matches") {
      const user = requireUser(request, response);
      if (!user) {
        return;
      }
      const body = await parseBody(request);
      const arena = arenas.find((entry) => entry.id === body.arenaId);
      if (!arena) {
        sendJson(response, 400, { error: `Arena ${body.arenaId} was not found` });
        return;
      }

      const participants = Array.isArray(body.participants) ? body.participants : [];
      if (participants.length < 2) {
        sendJson(response, 400, { error: "participants must reference two bots" });
        return;
      }

      const match = createMatchRecord({
        name: body.name,
        mode: body.mode ?? "live",
        arena,
        ownerUserId: user.id,
        participants
      });
      matches.unshift(match);
      sendJson(response, 201, { match, run: match });
      return;
    }

    if (request.method === "GET" && path === "/api/ladders") {
      const user = requireUser(request, response);
      if (!user) {
        return;
      }
      sendJson(response, 200, []);
      return;
    }

    if (request.method === "GET" && path === "/api/tournaments") {
      const user = requireUser(request, response);
      if (!user) {
        return;
      }
      sendJson(response, 200, []);
      return;
    }

    if (request.method === "GET" && path === "/api/users") {
      const user = requireAdmin(request, response);
      if (!user) {
        return;
      }
      sendJson(response, 200, users.map(toPublicUser));
      return;
    }

    if (request.method === "POST" && path === "/api/users") {
      const user = requireAdmin(request, response);
      if (!user) {
        return;
      }
      const body = await parseBody(request);
      const email = String(body.email ?? "").trim().toLowerCase();
      if (users.some((entry) => entry.email === email)) {
        sendJson(response, 409, { error: `User ${email} already exists` });
        return;
      }

      const record = createUserRecord({
        email,
        password: String(body.password ?? ""),
        role: body.role === "admin" ? "admin" : "user",
        isActive: body.isActive !== false
      });
      users.push(record);
      sendJson(response, 201, toPublicUser(record));
      return;
    }

    if (request.method === "POST" && /^\/api\/users\/[^/]+\/transfer-ownership$/.test(path)) {
      const user = requireAdmin(request, response);
      if (!user) {
        return;
      }
      const fromUserId = path.split("/")[3];
      const body = await parseBody(request);
      const targetUserId = String(body.targetUserId ?? "");
      const source = users.find((entry) => entry.id === fromUserId);
      const target = users.find((entry) => entry.id === targetUserId);
      if (!source || !target) {
        sendJson(response, 409, { error: "Both source and target users must exist" });
        return;
      }

      let botCount = 0;
      let arenaCount = 0;
      let matchCount = 0;

      for (const bot of bots) {
        if (bot.ownerUserId === source.id) {
          bot.ownerUserId = target.id;
          bot.ownerEmail = target.email;
          bot.updatedAt = nowIso();
          botCount += 1;
        }
      }

      for (const arena of arenas) {
        if (arena.ownerUserId === source.id) {
          arena.ownerUserId = target.id;
          arena.ownerEmail = target.email;
          arena.updatedAt = nowIso();
          arenaCount += 1;
        }
      }

      for (const match of matches) {
        if (match.ownerUserId === source.id) {
          match.ownerUserId = target.id;
          match.ownerEmail = target.email;
          match.updatedAt = nowIso();
          matchCount += 1;
        }
      }

      sendJson(response, 200, {
        fromUserId: source.id,
        toUserId: target.id,
        bots: botCount,
        arenas: arenaCount,
        ladders: 0,
        tournaments: 0,
        matches: matchCount
      });
      return;
    }

    sendJson(response, 404, { error: `No mock route for ${request.method} ${path}` });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`pcrobots mock api listening on http://127.0.0.1:${port}`);
});
