import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of transactions in dev, 10% in production — keeps overhead low at real traffic.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
