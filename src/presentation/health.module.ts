import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';
import { CheckHealthHandler } from '@application/health/queries/check-health/check-health.handler';
import { HEALTH_REPOSITORY } from '@application/health/health-repository.interface';
import { HealthRepository } from '@infrastructure/health/health.repository';
import { HealthController } from './health/health.controller';

@Module({
  imports: [CqrsModule, TerminusModule],
  controllers: [HealthController],
  providers: [
    CheckHealthHandler,
    { provide: HEALTH_REPOSITORY, useClass: HealthRepository },
  ],
})
export class HealthModule {}
