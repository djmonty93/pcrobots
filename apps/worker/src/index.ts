import { Worker } from "bullmq";

import { createRedisConnection, Database, executeStoredMatch, matchQueueName } from "@pcrobots/platform";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://pcrobots:pcrobots@localhost:5432/pcrobots";
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

const db = new Database(databaseUrl);
await db.migrate();

const worker = new Worker(
  matchQueueName,
  async (job) => {
    const result = await executeStoredMatch(db, job.data.matchId);

    return {
      matchId: result.id,
      status: result.status,
      updatedAt: result.updatedAt
    };
  },
  {
    connection: createRedisConnection(redisUrl),
    concurrency: 2
  }
);

worker.on("ready", () => {
  console.log("worker ready", { queue: matchQueueName });
});

worker.on("completed", (job, result) => {
  console.log("worker completed match", {
    jobId: job.id,
    matchId: result.matchId,
    status: result.status,
    updatedAt: result.updatedAt
  });
});

worker.on("failed", (job, error) => {
  console.error("worker failed match", {
    jobId: job?.id ?? null,
    matchId: job?.data.matchId ?? null,
    error: error.message
  });
});

setInterval(() => {
  console.log("worker heartbeat", new Date().toISOString());
}, 30000);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await Promise.allSettled([worker.close(), db.close()]);
    process.exit(0);
  });
}
