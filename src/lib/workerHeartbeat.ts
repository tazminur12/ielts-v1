import type IORedis from "ioredis";

export function startWorkerHeartbeat(input: {
  connection: IORedis;
  workerName: string;
  meta?: Record<string, unknown>;
}): () => void {
  const startedAt = Date.now();
  const key = `ielts:worker:${input.workerName}`;

  const tick = async () => {
    const payload = {
      workerName: input.workerName,
      pid: process.pid,
      startedAt,
      ts: Date.now(),
      meta: input.meta ?? {},
    };
    await input.connection.set(key, JSON.stringify(payload), "EX", 45);
  };

  void tick();
  const id = setInterval(() => void tick(), 15000);
  return () => clearInterval(id);
}

