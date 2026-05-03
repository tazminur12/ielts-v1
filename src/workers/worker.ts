import { startAutosubmitWorker } from "@/workers/autosubmitWorker";
import { startAiWorker } from "@/workers/aiWorker";

startAutosubmitWorker();
startAiWorker();
