import * as Sentry from "@sentry/node";

let initialized = false;

export function initSentryServer() {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  });
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  initSentryServer();
  if (!process.env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        scope.setContext(k, v as any);
      }
    }
    Sentry.captureException(err);
  });
}

