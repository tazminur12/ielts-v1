import { Worker } from "bullmq";
import IORedis from "ioredis";
import { processSpeakingTtsJob, processSpeakingAnalysisJob } from "@/lib/speakingTtsWorker";

const redisUrl = process.env.BULLMQ_REDIS_URL;
if (!redisUrl) {
  console.warn("BULLMQ_REDIS_URL not set, speaking background jobs will not process");
  process.exit(0);
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Process speaking TTS jobs
const ttsWorker = new Worker(
  "speaking-tts",
  async (job) => {
    await processSpeakingTtsJob(job);
  },
  {
    connection,
    concurrency: 2, // Limit concurrent TTS to avoid API rate limits
    removeOnComplete: { age: 3600 }, // Remove completed jobs after 1 hour
    removeOnFail: { age: 86400 }, // Keep failed jobs for 24 hours for debugging
  }
);

// Process speaking analysis jobs  
const analysisWorker = new Worker(
  "speaking-analysis",
  async (job) => {
    await processSpeakingAnalysisJob(job);
  },
  {
    connection,
    concurrency: 3, // Can run more analysis jobs in parallel
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  }
);

ttsWorker.on("completed", (job) => {
  console.log(`✅ TTS job ${job.id} completed`);
});

ttsWorker.on("failed", (job, err) => {
  console.error(`❌ TTS job ${job?.id} failed:`, err?.message);
});

analysisWorker.on("completed", (job) => {
  console.log(`✅ Analysis job ${job.id} completed`);
});

analysisWorker.on("failed", (job, err) => {
  console.error(`❌ Analysis job ${job?.id} failed:`, err?.message);
});

console.log("🚀 Speaking background workers started");
console.log("  - TTS worker (concurrency: 2)");
console.log("  - Analysis worker (concurrency: 3)");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down workers...");
  await ttsWorker.close();
  await analysisWorker.close();
  await connection.quit();
  process.exit(0);
});
