import OpenAI from "openai";
import { uploadToS3 } from "@/lib/s3Upload";

/** Merge section-level and per-group passages for listening (deduped). */
export function buildListeningTranscriptFromPayload(sec: {
  passage?: string;
  groups?: Array<{ passage?: string }>;
}): string {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (s: string) => {
    const x = s.trim();
    if (!x || seen.has(x)) return;
    seen.add(x);
    out.push(x);
  };
  if (sec.passage) push(sec.passage);
  const groups = sec.groups ?? [];
  for (const g of groups) {
    if (g.passage) push(g.passage);
  }
  return out.join("\n\n");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TTS_MODEL = process.env.OPENAI_TTS_MODEL?.trim() || "tts-1-hd";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE?.trim() || "alloy";
const TTS_SPEED = Math.min(
  4,
  Math.max(0.25, Number(process.env.OPENAI_TTS_SPEED) || 1)
);
/** Only applied for models that support `instructions` (e.g. gpt-4o-mini-tts). */
const TTS_INSTRUCTIONS =
  process.env.OPENAI_TTS_INSTRUCTIONS?.trim() ||
  "Clear British English, natural exam pace, as for an IELTS listening recording. Match dialogue or monologue to the script.";

/** OpenAI Speech API max input length per request */
const MAX_INPUT_CHARS = 4096;

export function isListeningTtsEnabled(): boolean {
  if (process.env.LISTENING_AUTO_TTS === "false") return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Text → OpenAI TTS (mp3) → S3 `tests/audio`. Long transcripts are split into
 * 4096-char chunks; MP3 buffers are concatenated (works for sequential playback in most browsers).
 */
export async function synthesizeListeningAudioToS3(
  transcript: string,
  fileBaseName: string
): Promise<{ url: string } | null> {
  if (!isListeningTtsEnabled()) return null;

  const t = transcript.trim();
  if (!t) return null;

  const chunks: string[] = [];
  for (let i = 0; i < t.length; i += MAX_INPUT_CHARS) {
    chunks.push(t.slice(i, i + MAX_INPUT_CHARS));
  }

  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const useInstructions = TTS_MODEL.includes("gpt-4o-mini-tts");
    const response = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: chunk,
      response_format: "mp3",
      speed: TTS_SPEED,
      ...(useInstructions ? { instructions: TTS_INSTRUCTIONS } : {}),
    });
    buffers.push(Buffer.from(await response.arrayBuffer()));
  }

  if (buffers.length === 0) return null;

  const combined = Buffer.concat(buffers);
  const safeName = `${fileBaseName.replace(/[^a-zA-Z0-9.-]/g, "_")}.mp3`;
  const { url } = await uploadToS3(
    combined,
    safeName,
    "audio/mpeg",
    "tests/audio"
  );
  return { url };
}
