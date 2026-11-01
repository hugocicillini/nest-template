import { CACHE } from '@application/_shared/cache.interface';
import { EMAIL_QUEUE } from '@application/_shared/email-queue.interface';
import { NOTIFICATION_QUEUE } from '@application/_shared/notification-queue.interface';
import { AppCacheModule } from '@infrastructure/_shared/cache.module';
import { PrismaService } from '@infrastructure/_shared/prisma.service';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DomainExceptionFilter } from '@presentation/_shared/filters/domain-exception.filter';
import { UnhandledExceptionFilter } from '@presentation/_shared/filters/unhandled-exception.filter';
import { EmailModule } from '@presentation/email.module';
import { NotificationModule } from '@presentation/notification.module';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { FakeCache } from './fake-cache';
import { FakeEmailQueue } from './fake-email-queue';
import { FakeNotificationQueue } from './fake-notification-queue';
import { TestCacheModule } from './test-cache.module';
import { TestEmailModule } from './test-email.module';
import { TestNotificationModule } from './test-notification.module';

export interface TestApp {
  app: INestApplication<App>;
  prisma: PrismaService;
  cache: FakeCache;
  emailQueue: FakeEmailQueue;
  notificationQueue: FakeNotificationQueue;
}

/**
 * Boots the real AppModule for e2e tests, swapping every Redis-backed
 * subtree for an in-memory fake via overrideModule (not overrideProvider -
 * see the plan for why that distinction matters here) so no real Redis
 * needs to be reachable. Postgres stays real.
 */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(AppCacheModule)
    .useModule(TestCacheModule)
    .overrideModule(EmailModule)
    .useModule(TestEmailModule)
    .overrideModule(NotificationModule)
    .useModule(TestNotificationModule)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();

  // Mirrors main.ts's bootstrap() - Test.createTestingModule never runs it.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(cookieParser());
  app.useGlobalPipes(new ZodValidationPipe());
  // Order matters, and it's the OPPOSITE of what you'd guess: Nest gives
  // priority to the filter registered LAST when more than one @Catch()
  // matches, confirmed empirically (swapping this order is what fixed every
  // DomainException resolving as a generic 500 instead of its mapped
  // status/code). UnhandledExceptionFilter's empty @Catch() matches
  // everything, so it must come first for DomainExceptionFilter's more
  // specific match to win. Mirrors main.ts - see the fix there too.
  app.useGlobalFilters(
    new UnhandledExceptionFilter(),
    new DomainExceptionFilter(),
  );

  await app.init();

  return {
    app,
    prisma: moduleRef.get(PrismaService),
    cache: moduleRef.get(CACHE),
    emailQueue: moduleRef.get(EMAIL_QUEUE),
    notificationQueue: moduleRef.get(NOTIFICATION_QUEUE),
  };
}
