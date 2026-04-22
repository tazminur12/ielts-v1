import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const GUEST_COOKIE = "guest_id";

export function getGuestId(req: NextRequest): string | null {
  return req.cookies.get(GUEST_COOKIE)?.value ?? null;
}

export function ensureGuestId(req: NextRequest, res: NextResponse): string {
  const existing = getGuestId(req);
  if (existing) return existing;
  const id = crypto.randomUUID();
  res.cookies.set(GUEST_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return id;
}

