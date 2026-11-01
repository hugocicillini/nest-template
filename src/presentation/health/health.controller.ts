import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { QueryBus } from '@nestjs/cqrs';
import { CheckHealthQuery } from '@application/health/queries/check-health/check-health.query';
import type { HealthCheckResult } from '@application/health/queries/check-health/check-health.handler';

// Health checks are infrastructure-level (load balancers, uptime monitors)
// and stay reachable at a stable path regardless of API version.
// @SkipThrottle(): a liveness/readiness probe hitting this every few seconds
// must never compete with real traffic for the global rate limit budget —
// otherwise the orchestrator can see a 429 and restart an otherwise-healthy pod.
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly queryBus: QueryBus) {}

  // Readiness: are dependencies reachable? Point a load balancer / k8s
  // readinessProbe here - failing this should pull the pod out of
  // rotation, not restart it.
  @Get()
  async check() {
    const result: HealthCheckResult = await this.queryBus.execute(
      new CheckHealthQuery(),
    );
    const database = { status: result.database };
    const redis = { status: result.redis };
    const queue = { status: result.queue };

    const up: Record<string, { status: string }> = {};
    const down: Record<string, { status: string }> = {};
    (result.database === 'up' ? up : down).database = database;
    (result.redis === 'up' ? up : down).redis = redis;
    (result.queue === 'up' ? up : down).queue = queue;

    return {
      status: result.status,
      info: up,
      error: down,
      details: { database, redis, queue },
    };
  }

  // Liveness: is the process itself running? No dependency checks on
  // purpose - point a k8s livenessProbe here instead of the readiness
  // route above, so a transient Postgres/Redis blip gets the pod pulled
  // from rotation (readiness) rather than killed and restarted
  // (liveness), which wouldn't fix an external dependency being down
  // anyway. No CQRS here either: there's no actual query being answered,
  // just a literal "the process can respond."
  @Get('live')
  liveness() {
    return { status: 'ok' };
  }
}
