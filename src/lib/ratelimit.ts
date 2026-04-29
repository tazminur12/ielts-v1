import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";

let cached:
  | {
      rl: Ratelimit;
    }
  | undefined;

export function getRatelimit() {
  if (cached?.rl) return cached.rl;
  const redis = getRedis();
  if (!redis) return null;
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "ielts:rl",
  });
  cached = { rl };
  return rl;
}

export async function rateLimitOrThrow(key: string, limitName = "default") {
  const rl = getRatelimit();
  if (!rl) return; // best-effort: allow when Redis isn't configured
  const id = `${limitName}:${key}`;
  const result = await rl.limit(id);
  if (result.success) return result;

  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  const err = new Error("rate_limited");
  (err as any).retryAfter = retryAfter;
  throw err;
}

