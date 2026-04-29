import { Redis } from "@upstash/redis";

let cached:
  | {
      redis: Redis;
    }
  | undefined;

export function getRedis(): Redis | null {
  if (cached?.redis) return cached.redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({
    url,
    token,
  });
  cached = { redis };
  return redis;
}

