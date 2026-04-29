import { NextResponse } from "next/server";

export type CachePreset =
  | { kind: "public"; sMaxAge: number; swr?: number }
  | { kind: "private-no-store" }
  | { kind: "no-store" };

export function withCacheHeaders(res: NextResponse, preset: CachePreset) {
  if (preset.kind === "public") {
    const swr = preset.swr ?? Math.max(0, preset.sMaxAge * 10);
    res.headers.set(
      "Cache-Control",
      `public, s-maxage=${preset.sMaxAge}, stale-while-revalidate=${swr}`
    );
    return res;
  }

  if (preset.kind === "private-no-store") {
    res.headers.set("Cache-Control", "private, no-store, max-age=0");
    return res;
  }

  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

