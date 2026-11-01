import type { IHealthRepository } from '@application/health/health-repository.interface';
import { HEALTH_REPOSITORY } from '@application/health/health-repository.interface';
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CheckHealthQuery } from './check-health.query';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  redis: 'up' | 'down';
  queue: 'up' | 'down';
}

@QueryHandler(CheckHealthQuery)
export class CheckHealthHandler implements IQueryHandler<
  CheckHealthQuery,
  HealthCheckResult
> {
  constructor(
    @Inject(HEALTH_REPOSITORY)
    private readonly healthRepository: IHealthRepository,
  ) {}

  async execute(): Promise<HealthCheckResult> {
    const [databaseUp, redisUp, queueUp] = await Promise.all([
      this.healthRepository.checkDatabase(),
      this.healthRepository.checkRedis(),
      this.healthRepository.checkQueue(),
    ]);

    return {
      status: databaseUp && redisUp && queueUp ? 'ok' : 'error',
      database: databaseUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'down',
      queue: queueUp ? 'up' : 'down',
    };
  }
}
