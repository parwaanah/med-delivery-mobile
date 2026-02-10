import * as Sentry from "sentry-expo";

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    enableInExpoDevelopment: true,
    debug: false,
    environment: process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV,
  });
}

