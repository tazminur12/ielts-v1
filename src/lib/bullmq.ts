import { Queue } from "bullmq";
import IORedis from "ioredis";

let cached:
  | {
      connection: IORedis;
      autosubmitQueue: Queue;
      aiQueue: Queue;
    }
  | undefined;

export function getBullConnection(): IORedis | null {
  if (cached?.connection) return cached.connection;
  const url = process.env.BULLMQ_REDIS_URL;
  if (!url) return null;

  const connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const autosubmitQueue = new Queue("autosubmit", {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  });

  const aiQueue = new Queue("ai", {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  });

  cached = { connection, autosubmitQueue, aiQueue };
  return connection;
}

export function getAutosubmitQueue(): Queue | null {
  if (cached?.autosubmitQueue) return cached.autosubmitQueue;
  const conn = getBullConnection();
  if (!conn) return null;
  return cached!.autosubmitQueue;
}

export function getAiQueue(): Queue | null {
  if (cached?.aiQueue) return cached.aiQueue;
  const conn = getBullConnection();
  if (!conn) return null;
  return cached!.aiQueue;
}
