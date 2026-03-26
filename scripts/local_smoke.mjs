const apiBaseUrl = process.env.PCROBOTS_API_URL ?? "http://127.0.0.1:3001";
const pollTimeoutMs = Number(process.env.PCROBOTS_SMOKE_TIMEOUT_MS ?? 120000);
const pollIntervalMs = 2000;
const adminEmail = process.env.PCROBOTS_ADMIN_EMAIL ?? "admin@pcrobots.local";
const adminPassword = process.env.PCROBOTS_ADMIN_PASSWORD ?? "change-me-admin-password";

function log(step, payload) {
  if (payload === undefined) {
    console.log(`[smoke] ${step}`);
    return;
  }

  console.log(`[smoke] ${step}`, payload);
}

async function requestJson(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
  };

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  const payload = text.length > 0 ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${text}`);
  }

  return payload;
}

async function requestExpectFailure(path, expectedStatus, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
  };

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(`${options.method ?? "GET"} ${path} expected ${expectedStatus} but got ${response.status}: ${text}`);
  }

  return text.length > 0 ? JSON.parse(text) : null;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function createArenaText() {
  const lines = Array.from({ length: 100 }, () => ".".repeat(100));
  lines[10] = `B${".".repeat(19)}A${".".repeat(79)}`;
  lines[40] = `${".".repeat(20)}XXX${".".repeat(77)}`;
  return lines.join("\n");
}

async function waitForHealthyApi() {
  const deadline = Date.now() + pollTimeoutMs;
  while (Date.now() < deadline) {
    try {
      const health = await requestJson("/health");
      if (health?.ok) {
        log("api healthy", health);
        return;
      }
    } catch {
      // retry until timeout
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`API did not become healthy within ${pollTimeoutMs}ms`);
}

async function createSession(email, password, mode = "login") {
  const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
  return requestJson(path, {
    method: "POST",
    body: { email, password }
  });
}

async function main() {
  await waitForHealthyApi();

  const now = Date.now();
  const userOneEmail = `smoke.user1.${now}@pcrobots.local`;
  const userTwoEmail = `smoke.user2.${now}@pcrobots.local`;
  const userPassword = `SmokePass${now}99`;

  const adminSession = await createSession(adminEmail, adminPassword, "login");
  const userOneSession = await createSession(userOneEmail, userPassword, "register");
  const userTwoSession = await createSession(userTwoEmail, userPassword, "register");
  log("created sessions", {
    admin: adminSession.user.email,
    userOne: userOneSession.user.email,
    userTwo: userTwoSession.user.email
  });

  await requestExpectFailure("/api/users", 403, { token: userOneSession.token });
  log("verified non-admin cannot list users");

  const botAlpha = await requestJson("/api/bots", {
    method: "POST",
    token: userOneSession.token,
    body: {
      name: `Smoke Alpha ${now}`,
      description: "auth smoke bot",
      language: "javascript",
      source: `module.exports = function onTurn() {
  return { kind: "movement", targetSpeed: 0, heading: 0 };
};`
    }
  });

  const botBeta = await requestJson("/api/bots", {
    method: "POST",
    token: userOneSession.token,
    body: {
      name: `Smoke Beta ${now}`,
      description: "auth smoke bot",
      language: "lua",
      source: `local function on_turn(snapshot)
  if snapshot.tick == 0 then
    return { kind = "scan", heading = 180, resolution = 10 }
  end

  return { kind = "movement", targetSpeed = 100, heading = 180 }
end

return on_turn
`
    }
  });

  const botGamma = await requestJson("/api/bots", {
    method: "POST",
    token: userOneSession.token,
    body: {
      name: `Smoke Gamma ${now}`,
      description: "auth smoke bot",
      language: "python",
      source: `def on_turn(snapshot):
    return {"kind": "movement", "targetSpeed": 100, "heading": 180}
`
    }
  });

  const botDelta = await requestJson("/api/bots", {
    method: "POST",
    token: userOneSession.token,
    body: {
      name: `Smoke Delta ${now}`,
      description: "auth smoke bot",
      language: "javascript",
      source: `module.exports = function onTurn(snapshot) {
  if (snapshot.tick === 0) {
    return { kind: "scan", heading: 0, resolution: 8 };
  }

  return { kind: "movement", targetSpeed: 40, heading: 0 };
};`
    }
  });

  const arena = await requestJson("/api/arenas", {
    method: "POST",
    token: userOneSession.token,
    body: {
      name: `Smoke Arena ${now}`,
      description: "auth smoke arena",
      text: createArenaText()
    }
  });
  log("user one created resources", { botAlpha: botAlpha.id, botBeta: botBeta.id, botGamma: botGamma.id, botDelta: botDelta.id, arena: arena.id });

  const userTwoBotsBeforeTransfer = await requestJson("/api/bots", { token: userTwoSession.token });
  if (userTwoBotsBeforeTransfer.some((bot) => bot.id === botAlpha.id || bot.id === botBeta.id || bot.id === botGamma.id || bot.id === botDelta.id)) {
    throw new Error("User two can see user one bots before transfer");
  }
  await requestExpectFailure(`/api/bots/${botAlpha.id}`, 404, { token: userTwoSession.token });
  log("verified ownership isolation before transfer");

  const liveMatchResponse = await requestJson("/api/matches", {
    method: "POST",
    token: userOneSession.token,
    body: {
      name: `Smoke Live ${now}`,
      mode: "live",
      arenaId: arena.id,
      seed: 1337,
      maxTicks: 40,
      participants: [
        { botId: botAlpha.id, teamId: "A" },
        { botId: botBeta.id, teamId: "B" }
      ]
    }
  });
  const liveMatch = liveMatchResponse.run;
  if (liveMatch.status !== "completed") {
    throw new Error(`Live sandbox match did not complete: ${JSON.stringify(liveMatch)}`);
  }
  log("completed live sandbox match", {
    matchId: liveMatch.id,
    winnerTeamId: liveMatch.result?.winnerTeamId ?? null,
    errorMessage: liveMatch.errorMessage ?? null
  });

  const adminUsersBeforeTransfer = await requestJson("/api/users", { token: adminSession.token });
  const userOneRecord = adminUsersBeforeTransfer.find((user) => user.email === userOneEmail);
  const userTwoRecord = adminUsersBeforeTransfer.find((user) => user.email === userTwoEmail);
  if (!userOneRecord || !userTwoRecord) {
    throw new Error("Expected both registered users to appear in admin user listing");
  }

  const transfer = await requestJson(`/api/users/${userOneRecord.id}/transfer-ownership`, {
    method: "POST",
    token: adminSession.token,
    body: { targetUserId: userTwoRecord.id }
  });
  if (transfer.bots < 4 || transfer.arenas < 1 || transfer.matches < 1) {
    throw new Error(`Ownership transfer moved an unexpected number of resources: ${JSON.stringify(transfer)}`);
  }
  log("transferred ownership", transfer);

  const userTwoBotsAfterTransfer = await requestJson("/api/bots", { token: userTwoSession.token });
  if (
    !userTwoBotsAfterTransfer.some((bot) => bot.id === botAlpha.id) ||
    !userTwoBotsAfterTransfer.some((bot) => bot.id === botBeta.id) ||
    !userTwoBotsAfterTransfer.some((bot) => bot.id === botGamma.id) ||
    !userTwoBotsAfterTransfer.some((bot) => bot.id === botDelta.id)
  ) {
    throw new Error("Transferred bots did not become visible to user two");
  }

  const userTwoArenasAfterTransfer = await requestJson("/api/arenas", { token: userTwoSession.token });
  if (!userTwoArenasAfterTransfer.some((entry) => entry.id === arena.id)) {
    throw new Error("Transferred arena did not become visible to user two");
  }
  log("verified ownership visibility after transfer");

  const deletedUser = await requestJson(`/api/users/${userOneRecord.id}`, {
    method: "DELETE",
    token: adminSession.token
  });
  if (!deletedUser.deleted) {
    throw new Error(`Expected deletion payload for user one: ${JSON.stringify(deletedUser)}`);
  }
  log("deleted transferred user", { id: userOneRecord.id });

  const tournament = await requestJson("/api/tournaments", {
    method: "POST",
    token: userTwoSession.token,
    body: {
      name: `Smoke Cup ${now}`,
      description: "authenticated smoke tournament",
      format: "single-elimination",
      arenaId: arena.id,
      maxTicks: 140,
      seedBase: 9000,
      entryBotIds: [botAlpha.id, botBeta.id, botGamma.id, botDelta.id]
    }
  });
  log("created tournament", { id: tournament.id, rounds: tournament.rounds.length });

  const runResponse = await requestJson(`/api/tournaments/${tournament.id}/run-pending`, {
    method: "POST",
    token: userTwoSession.token,
    body: {
      enqueue: true
    }
  });
  log("enqueued tournament matches", { count: runResponse.count, processedMatchIds: runResponse.processedMatchIds });

  const deadline = Date.now() + pollTimeoutMs;
  while (Date.now() < deadline) {
    const current = await requestJson(`/api/tournaments/${tournament.id}`, { token: userTwoSession.token });
    const summary = current.summary;
    log("tournament status", summary);

    if (summary.failedMatches > 0) {
      throw new Error(`Tournament recorded ${summary.failedMatches} failed match(es)`);
    }

    if (summary.completedMatches >= 1 && summary.pendingMatches === 0 && summary.queuedMatches === 0 && summary.runningMatches === 0) {
      const completedMatch = current.rounds.flatMap((round) => round.matches).find((match) => match.status === "completed");
      if (!completedMatch) {
        throw new Error("Tournament reported completion without a completed match record");
      }

      const winnerTeamId = completedMatch.result?.winnerTeamId ?? null;
      if (!winnerTeamId) {
        throw new Error(`Completed elimination match did not report a winner: ${JSON.stringify(completedMatch.result)}`);
      }

      const championBotName = summary.championBotName ?? null;
      if (!championBotName) {
        throw new Error(`Completed elimination tournament did not report a champion: ${JSON.stringify(summary)}`);
      }

      log("smoke complete", {
        tournamentId: current.id,
        champion: championBotName,
        matchId: completedMatch.id,
        winnerTeamId
      });
      return;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`Tournament did not complete within ${pollTimeoutMs}ms`);
}

main().catch((error) => {
  console.error("[smoke] failure", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
