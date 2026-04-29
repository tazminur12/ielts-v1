import { redisGetJson, redisSetJson } from "@/lib/redisCache";

const local = globalThis as unknown as {
  __ieltsCacheBusters?: Map<string, { value: string; expiresAt: number }>;
};

function getLocalMap() {
  if (!local.__ieltsCacheBusters) local.__ieltsCacheBusters = new Map();
  return local.__ieltsCacheBusters;
}

export async function getCacheBuster(name: string): Promise<string> {
  const m = getLocalMap();
  const now = Date.now();
  const hit = m.get(name);
  if (hit && hit.expiresAt > now) return hit.value;

  const key = `ielts:cacheBuster:${name}:v1`;
  const v = (await redisGetJson<string>(key)) ?? "0";
  m.set(name, { value: v, expiresAt: now + 30_000 }); // local 30s
  return v;
}

export async function bumpCacheBuster(name: string): Promise<void> {
  const key = `ielts:cacheBuster:${name}:v1`;
  const v = String(Date.now());
  await redisSetJson(key, v, 60 * 60 * 24 * 30); // keep 30 days
  // refresh local immediately
  getLocalMap().set(name, { value: v, expiresAt: Date.now() + 30_000 });
}

