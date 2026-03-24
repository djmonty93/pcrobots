const apiBaseUrl = process.env.PCROBOTS_API_URL ?? "http://127.0.0.1:3001";
const pollTimeoutMs = Number(process.env.PCROBOTS_SMOKE_TIMEOUT_MS ?? 120000);
const pollIntervalMs = 2000;

function log(step, payload) {
  if (payload === undefined) {
    console.log(`[smoke] ${step}`);
    return;
  }

  console.log(`[smoke] ${step}`, payload);
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  const payload = text.length > 0 ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${text}`);
  }

  return payload;
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

async function main() {
  await waitForHealthyApi();

  const botAlpha = await requestJson("/api/bots", {
    method: "POST",
    body: {
      name: `Smoke Alpha ${Date.now()}`,
      description: "compose smoke bot",
      language: "javascript",
      source: `module.exports = function onTurn() {
  return { kind: "movement", targetSpeed: 0, heading: 0 };
};`
    }
  });
  log("created bot alpha", { id: botAlpha.id, name: botAlpha.name });

  const botBeta = await requestJson("/api/bots", {
    method: "POST",
    body: {
      name: `Smoke Beta ${Date.now()}`,
      description: "compose smoke bot",
      language: "javascript",
      source: `module.exports = function onTurn() {
  return { kind: "movement", targetSpeed: 100, heading: 180 };
};`
    }
  });
  log("created bot beta", { id: botBeta.id, name: botBeta.name });

  const arena = await requestJson("/api/arenas", {
    method: "POST",
    body: {
      name: `Smoke Arena ${Date.now()}`,
      description: "compose smoke arena",
      text: createArenaText()
    }
  });
  log("created arena", { id: arena.id, name: arena.name });

  const tournament = await requestJson("/api/tournaments", {
    method: "POST",
    body: {
      name: `Smoke Cup ${Date.now()}`,
      description: "compose smoke tournament",
      format: "single-elimination",
      arenaId: arena.id,
      maxTicks: 140,
      seedBase: 9000,
      entryBotIds: [botAlpha.id, botBeta.id]
    }
  });
  log("created tournament", { id: tournament.id, rounds: tournament.rounds.length });

  const runResponse = await requestJson(`/api/tournaments/${tournament.id}/run-pending`, {
    method: "POST",
    body: {
      enqueue: true
    }
  });
  log("enqueued tournament matches", { count: runResponse.count, processedMatchIds: runResponse.processedMatchIds });

  const deadline = Date.now() + pollTimeoutMs;
  while (Date.now() < deadline) {
    const current = await requestJson(`/api/tournaments/${tournament.id}`);
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
