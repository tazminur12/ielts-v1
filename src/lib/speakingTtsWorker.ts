import { synthesizeListeningAudioToS3 } from "@/lib/listeningTts";
import Answer from "@/models/Answer";
import connectDB from "@/lib/mongodb";
import { captureException } from "@/lib/sentryServer";
import { logger } from "@/lib/logger";

const log = logger();

/**
 * Process TTS generation for speaking questions in background.
 * This prevents blocking the API response while generating audio.
 */
export async function processSpeakingTtsJob(job: any): Promise<void> {
  const { text, attemptId, questionId, answerId } = job.data;

  if (!text || !answerId) {
    log.warn({ data: job.data }, "Missing text or answerId for TTS job");
    return;
  }

  try {
    await connectDB();

    // Generate TTS audio
    const ttsResult = await synthesizeListeningAudioToS3(
      text,
      `speak-ai-${attemptId}-${questionId}`
    );

    if (!ttsResult?.url) {
      log.warn({ attemptId, questionId }, "TTS generation returned no URL");
      return;
    }

    // Update answer with TTS audio URL
    await Answer.findByIdAndUpdate(
      answerId,
      {
        $set: {
          aiAudioUrl: ttsResult.url,
          aiAudioGeneratedAt: new Date(),
        },
      },
      { new: true }
    );

    log.info(
      { answerId, questionId, audioUrl: ttsResult.url },
      "TTS generated successfully"
    );
  } catch (error: any) {
    log.error(
      { error: error?.message, attemptId, questionId, answerId },
      "Error processing TTS job"
    );

    captureException(error, {
      attemptId,
      questionId,
      answerId,
      context: "speakingTtsWorker",
    });

    // Re-throw to trigger retry
    throw error;
  }
}

/**
 * Process audio analysis for speaking answers in background.
 * This prevents blocking the upload response while analyzing.
 */
export async function processSpeakingAnalysisJob(job: any): Promise<void> {
  const { answerId, audioUrl, questionId } = job.data;

  if (!answerId || !audioUrl) {
    log.warn({ data: job.data }, "Missing answerId or audioUrl for analysis job");
    return;
  }

  try {
    await connectDB();

    // Download audio from S3 for analysis
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // Call analyze endpoint (in-process to avoid infinite loops)
    const analyzeRes = await fetch(
      "http://localhost:3000/api/speaking/analyze",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: "audio/webm",
          durationSeconds: 0,
          questionId,
          answerId,
        }),
      }
    );

    if (!analyzeRes.ok) {
      const errData = await analyzeRes.json().catch(() => ({}));
      throw new Error(errData?.message || "Failed to analyze speaking");
    }

    const { pronunciation, hesitation } = await analyzeRes.json();

    // Update answer with analysis results
    await Answer.findByIdAndUpdate(
      answerId,
      {
        $set: {
          pronunciationScore: pronunciation?.score || 0,
          hesitationRate: hesitation?.ratePerMinute || 0,
          fluencyScore: hesitation?.fluencyScore || 0,
          analyzedAt: new Date(),
        },
      },
      { new: true }
    );

    log.info(
      { answerId, questionId, pronunciationScore: pronunciation?.score },
      "Audio analysis completed"
    );
  } catch (error: any) {
    log.error(
      { error: error?.message, answerId, questionId },
      "Error processing analysis job"
    );

    captureException(error, {
      answerId,
      questionId,
      context: "speakingAnalysisWorker",
    });

    throw error;
  }
}
