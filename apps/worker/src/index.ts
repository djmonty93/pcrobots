import { Worker } from "bullmq";

import {
  createMatchQueue,
  createRedisConnection,
  Database,
  executeStoredMatch,
  matchQueueName,
  queueMatchRun,
  retry
} from "@pcrobots/platform";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://pcrobots:pcrobots@localhost:5432/pcrobots";
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

const db = new Database(databaseUrl);
const matchQueue = createMatchQueue(redisUrl);

await retry(async () => {
  await db.migrate();
  await matchQueue.waitUntilReady();
}, { label: "worker bootstrap" });

async function queueMatches(matchIds: string[]): Promise<string[]> {
  const queuedMatchIds: string[] = [];

  for (const matchId of matchIds) {
    const match = await db.getMatch(matchId);
    if (!match) {
      continue;
    }

    try {
      const queued = await queueMatchRun(db, matchQueue, match);
      if (queued.queued) {
        queuedMatchIds.push(queued.matchId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("failed to queue follow-up match", { matchId, error: message });
      throw error;
    }
  }

  return queuedMatchIds;
}

const worker = new Worker(
  matchQueueName,
  async (job) => {
    const result = await executeStoredMatch(db, job.data.matchId);
    const queuedMatchIds = await queueMatches(result.followUpMatchIds);

    return {
      matchId: result.match.id,
      status: result.match.status,
      updatedAt: result.match.updatedAt,
      queuedMatchIds
    };
  },
  {
    connection: createRedisConnection(redisUrl),
    concurrency: 2
  }
);

await retry(() => worker.waitUntilReady(), { label: "worker ready" });

worker.on("ready", () => {
  console.log("worker ready", { queue: matchQueueName });
});

worker.on("completed", (job, result) => {
  console.log("worker completed match", {
    jobId: job.id,
    matchId: result.matchId,
    status: result.status,
    updatedAt: result.updatedAt,
    queuedMatchIds: result.queuedMatchIds
  });
});

worker.on("failed", (job, error) => {
  console.error("worker failed match", {
    jobId: job?.id ?? null,
    matchId: job?.data.matchId ?? null,
    error: error.message
  });
});

worker.on("error", (error) => {
  console.error("worker error", { error: error.message });
});

worker.on("stalled", (jobId) => {
  console.warn("worker job stalled", { jobId });
});

setInterval(() => {
  console.log("worker heartbeat", new Date().toISOString());
}, 30000);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    const results = await Promise.allSettled([worker.close(), matchQueue.close(), db.close()]);
    const services = ["worker", "matchQueue", "db"];
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error("failed to close service during shutdown", {
          service: services[index],
          error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        });
      }
    }
    process.exit(0);
  });
}
