import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Must run before anything else - Sentry's SDK does its own OpenTelemetry
 * auto-instrumentation, which patches modules (http, express, pg, pino, ...)
 * the first time they're require()'d. Imported as the literal first line of
 * main.ts, same reasoning template projects use for any preload-style setup.
 *
 * No-op with no DSN configured: error capture, tracing, profiling, and logs
 * are all simply inactive, same "zero infra needed to run the app" fallback
 * as everything else optional in this project.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Deliberately NOT setting `dataCollection` here: per Sentry's docs,
    // omitting it entirely keeps the conservative `sendDefaultPii: false`
    // default (no cookies, no HTTP bodies, no user info sent). Adding a
    // `dataCollection` key - even `{}` - flips every *unset* category to
    // its permissive default instead. This app has plaintext passwords in
    // login/register/reset-password bodies and a live refresh token in a
    // cookie, so that flip is a real credential-leak risk, not a nuance.

    // Error Monitoring: on by default once dsn is set - unhandled
    // exceptions are captured automatically (see UnhandledExceptionFilter).

    // Tracing: 1.0 = capture every transaction. Fine as a template default;
    // lower this in a real production deployment to control quota/cost.
    tracesSampleRate: 1.0,

    // Profiling (requires tracing to be active - tracesSampleRate > 0).
    // profileSessionSampleRate is decided once per process at startup, not
    // per-request - sampling a fraction of pods/instances in production.
    profileSessionSampleRate: 1.0,
    profileLifecycle: 'trace',

    // Structured logs: bridges this app's existing pino/nestjs-pino output
    // straight to Sentry Logs, no call-site changes anywhere else needed.
    enableLogs: true,

    integrations: [
      nodeProfilingIntegration(),
      Sentry.pinoIntegration(),
      Sentry.prismaIntegration(),
    ],
  });
}
