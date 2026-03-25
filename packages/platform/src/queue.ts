import { Queue, type Job } from "bullmq";

import { type Database, type MatchRecord } from "./db.js";

export const matchQueueName = "pcrobots-match-runs";

export interface MatchRunJobData {
  matchId: string;
}

export function createRedisConnection(redisUrl: string) {
  return { url: redisUrl };
}

export function createMatchQueue(redisUrl: string): Queue<MatchRunJobData> {
  return new Queue<MatchRunJobData>(matchQueueName, {
    connection: createRedisConnection(redisUrl)
  });
}

export function enqueueMatchRun(queue: Queue<MatchRunJobData>, matchId: string): Promise<Job<MatchRunJobData>> {
  return queue.add(
    "execute-match",
    { matchId },
    {
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}

export async function queueMatchRun(
  database: Database,
  queue: Queue<MatchRunJobData>,
  match: MatchRecord
): Promise<{ matchId: string; jobId: string; queued: boolean }> {
  if (match.status === "queued") {
    return {
      matchId: match.id,
      jobId: match.id,
      queued: false
    };
  }

  if (match.status === "running" || match.status === "completed") {
    throw new Error(`Match ${match.id} cannot be queued from status ${match.status}`);
  }

  const transitioned = await database.transitionMatchStatus(match.id, [match.status], "queued");
  if (!transitioned) {
    const current = await database.getMatch(match.id);
    if (current?.status === "queued") {
      return {
        matchId: current.id,
        jobId: current.id,
        queued: false
      };
    }

    throw new Error(`Match ${match.id} cannot be queued from status ${current?.status ?? "missing"}`);
  }

  try {
    const job = await enqueueMatchRun(queue, match.id);
    return {
      matchId: match.id,
      jobId: String(job.id),
      queued: true
    };
  } catch (error) {
    await database.transitionMatchStatus(match.id, ["queued"], match.status);
    throw error;
  }
}
