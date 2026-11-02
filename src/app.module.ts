import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { AppCacheModule } from '@infrastructure/_shared/cache.module';
import { envSchema } from '@infrastructure/_shared/env.schema';
import { parseRedisUrl } from '@infrastructure/_shared/parse-redis-url';
import { PrismaModule } from '@infrastructure/_shared/prisma.module';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { LoggerModule } from 'nestjs-pino';
import { AuditLogModule } from './presentation/audit-log.module';
import { AuthModule } from './presentation/auth.module';
import { EmailModule } from './presentation/email.module';
import { FileAssetModule } from './presentation/file-asset.module';
import { HealthModule } from './presentation/health.module';
import { NotificationModule } from './presentation/notification.module';
import { RolesModule } from './presentation/roles.module';
import { UsersModule } from './presentation/users.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        // Reuses an incoming X-Request-Id (e.g. set by an upstream proxy)
        // when present, otherwise generates one - and echoes it back so a
        // client can hand support "this exact request" and have it
        // correlated against logs/Sentry (see the exception filters, which
        // include req.id in their JSON error body).
        genReqId: (req, res) => {
          const existing = req.headers['x-request-id'];
          const id =
            (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
          res.setHeader('X-Request-Id', id);
          return id;
        },
        // Without this, the JWT Bearer token and the refresh-token cookie
        // are logged verbatim on every request/response - and since
        // Sentry.pinoIntegration() (instrument.ts) bridges this logger's
        // output straight into Sentry Logs, unredacted secrets would flow
        // there too.
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          censor: '[Redacted]',
        },
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty' },
      },
    }),
    // Redis-backed, not the package's default in-memory Map: horizontally
    // scaled instances must share one counter per client, or each replica
    // enforces the limit independently and the effective limit becomes
    // (configured limit) x (replica count).
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
        ...(process.env.NODE_ENV === 'test'
          ? {}
          : {
              storage: new ThrottlerStorageRedisService({
                ...parseRedisUrl(process.env.REDIS_URL as string),
                // parseRedisUrl's maxRetriesPerRequest: null is right for
                // BullMQ (fine to wait on a queue) but wrong here:
                // ThrottlerGuard runs on every request, so a Redis outage
                // must fail fast - clients get a fast 500, recoverable the
                // moment Redis is back - instead of every request hanging
                // forever waiting on a command that never gives up.
                maxRetriesPerRequest: 1,
                connectTimeout: 3_000,
              }),
            }),
      }),
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: parseRedisUrl(process.env.REDIS_URL as string),
      // The resilience policy (queue-resilience.policy.ts) deliberately has
      // no retry of its own - timeout + circuit breaker only - relying on
      // this default instead, so a job isn't retried twice over (once by
      // the policy, once by BullMQ).
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
      },
    }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
      middleware: (_req: Request, res: Response, next: NextFunction) => {
        if (process.env.NODE_ENV !== 'development') {
          res.status(404).end();
          return;
        }
        next();
      },
    }),
    PrismaModule,
    AppCacheModule,
    HealthModule,
    AuthModule,
    RolesModule,
    UsersModule,
    AuditLogModule,
    NotificationModule,
    FileAssetModule,
    EmailModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
