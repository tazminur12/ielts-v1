"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/browser";

let initialized = false;

export default function ClientSentryInit() {
  useEffect(() => {
    if (initialized) return;
    initialized = true;
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0),
    });
  }, []);

  return null;
}

