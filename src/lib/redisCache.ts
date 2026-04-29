import { getRedis } from "@/lib/redis";

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  const v = await redis.get<T>(key);
  return (v ?? null) as T | null;
}

export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(key, value, { ex: ttlSeconds });
}

export async function redisDelete(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(key);
}

