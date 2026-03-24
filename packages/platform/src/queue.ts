import { Queue, type Job } from "bullmq";

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
      jobId: matchId,
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}
