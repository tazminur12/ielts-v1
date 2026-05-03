import pino from "pino";
import type { NextRequest } from "next/server";
import { getRequestId } from "@/lib/requestId";

const baseLogger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: {
    service: "ielts-platform",
    env: process.env.NODE_ENV || "development",
  },
});

export function logger() {
  return baseLogger;
}

export function requestLogger(req: NextRequest) {
  const requestId = getRequestId(req.headers) || "unknown";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  return baseLogger.child({
    requestId,
    method: req.method,
    path: req.nextUrl.pathname,
    ip,
  });
}

