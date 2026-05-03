import type { NextRequest } from "next/server";

export function getAttemptSessionId(req: NextRequest): string | null {
  const v = req.headers.get("x-attempt-session");
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  return s;
}

export type AttemptSessionCheck =
  | { ok: true; takeover: false }
  | { ok: true; takeover: true }
  | { ok: false; reason: "missing_session" | "locked" };

export function checkAttemptSession(input: {
  attempt: {
    activeSessionId?: string;
    lastSeenAt?: Date;
  };
  incomingSessionId: string | null;
  now?: Date;
  staleAfterSeconds?: number;
}): AttemptSessionCheck {
  const now = input.now ?? new Date();
  const staleAfterSeconds = input.staleAfterSeconds ?? 30;
  const incoming = input.incomingSessionId;
  if (!incoming) return { ok: false, reason: "missing_session" };

  const existing = input.attempt.activeSessionId;
  if (!existing) return { ok: true, takeover: true };
  if (existing === incoming) return { ok: true, takeover: false };

  const lastSeenAt = input.attempt.lastSeenAt;
  if (!lastSeenAt) return { ok: true, takeover: true };
  const ageSeconds = Math.floor((now.getTime() - new Date(lastSeenAt).getTime()) / 1000);
  if (ageSeconds > staleAfterSeconds) return { ok: true, takeover: true };
  return { ok: false, reason: "locked" };
}

