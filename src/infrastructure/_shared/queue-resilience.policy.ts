import {
  circuitBreaker,
  ConsecutiveBreaker,
  handleAll,
  timeout,
  TimeoutStrategy,
  wrap,
} from 'cockatiel';

// On SIGTERM, @nestjs/bullmq waits for whatever job is currently running
// before disconnecting each Worker (see bull.explorer.js's
// onApplicationShutdown -> worker.close(false)). JOB_TIMEOUT_MS is the
// effective upper bound on how long that can take - the container/
// orchestrator's shutdown grace period (e.g. docker run --stop-timeout,
// docker-compose's stop_grace_period, Kubernetes'
// terminationGracePeriodSeconds) must exceed it, or a job gets SIGKILLed
// mid-flight instead of finishing cleanly. See README.md's Docker section
// for the recommended value.
const JOB_TIMEOUT_MS = 10_000;
const CONSECUTIVE_FAILURES_TO_OPEN = 5;
const HALF_OPEN_AFTER_MS = 10_000;

/**
 * Timeout + circuit breaker for BullMQ job processors. Deliberately excludes
 * retry: BullMQ already retries jobs via `attempts`/`backoff` on the queue
 * itself, so an extra retry layer here would multiply attempts instead of
 * adding one. Build one instance per Processor and keep it as an instance
 * field - the breaker holds state across calls and must be shared.
 */
export function createQueueJobPolicy() {
  const breaker = circuitBreaker(handleAll, {
    halfOpenAfter: HALF_OPEN_AFTER_MS,
    breaker: new ConsecutiveBreaker(CONSECUTIVE_FAILURES_TO_OPEN),
  });

  const jobTimeout = timeout(JOB_TIMEOUT_MS, TimeoutStrategy.Cooperative);

  return wrap(jobTimeout, breaker);
}
