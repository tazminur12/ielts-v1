import connectDB from "@/lib/mongodb";
import QueueFailure from "@/models/QueueFailure";

export async function recordQueueFailure(input: {
  queue: string;
  jobId: string;
  name: string;
  data?: unknown;
  failedReason?: string;
  stacktrace?: string[];
  attemptsMade?: number;
}): Promise<void> {
  await connectDB();
  await QueueFailure.findOneAndUpdate(
    { queue: input.queue, jobId: input.jobId },
    {
      $set: {
        name: input.name,
        data: input.data,
        failedReason: input.failedReason,
        stacktrace: input.stacktrace,
        attemptsMade: input.attemptsMade,
        lastFailedAt: new Date(),
      },
      $setOnInsert: { queue: input.queue, jobId: input.jobId },
    },
    { upsert: true }
  );
}

