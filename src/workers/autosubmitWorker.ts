import "server-only";

import { Worker } from "bullmq";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import { submitAttemptDoc } from "@/lib/attemptSubmission";
import { getBullConnection } from "@/lib/bullmq";
import { recordQueueFailure } from "@/lib/queueFailure";
import { startWorkerHeartbeat } from "@/lib/workerHeartbeat";

export function startAutosubmitWorker() {
  const connection = getBullConnection();
  if (!connection) {
    throw new Error("BULLMQ_REDIS_URL is missing");
  }

  const stopHeartbeat = startWorkerHeartbeat({
    connection,
    workerName: "autosubmit",
  });

  const worker = new Worker(
    "autosubmit",
    async (job: any) => {
      if (job.name !== "scan") return null;
      await connectDB();
      const now = new Date();
      const attempts = await Attempt.find({
        status: "in_progress",
        expiresAt: { $exists: true, $lte: now },
      })
        .sort({ expiresAt: 1 })
        .limit(200);

      let submitted = 0;
      let evaluated = 0;

      for (const attempt of attempts as any[]) {
        const actor = attempt.userId
          ? ({ userId: String(attempt.userId) } as const)
          : ({ guestId: String(attempt.guestId) } as const);
        const r = await submitAttemptDoc({ attempt, actor, now });
        if (r.status === "evaluated") evaluated += 1;
        else submitted += 1;
      }

      return { processed: attempts.length, submitted, evaluated };
    },
    {
      connection,
      concurrency: 2,
    }
  );

  worker.on("failed", async (job: any, err: any) => {
    if (!job) return;
    await recordQueueFailure({
      queue: "autosubmit",
      jobId: String(job.id),
      name: String(job.name),
      data: job.data,
      failedReason: err?.message || job.failedReason,
      stacktrace: Array.isArray(job.stacktrace) ? job.stacktrace : [],
      attemptsMade: job.attemptsMade,
    });
  });

  worker.on("closed", () => stopHeartbeat());

  return worker;
}
