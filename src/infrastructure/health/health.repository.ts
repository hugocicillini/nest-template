import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import Redis from 'ioredis';
import { IHealthRepository } from '@application/health/health-repository.interface';
import { CACHE } from '@application/_shared/cache.interface';
import type { ICache } from '@application/_shared/cache.interface';
import { parseRedisUrl } from '../_shared/parse-redis-url';
import { PrismaService } from '../_shared/prisma.service';

const REDIS_PING_KEY = 'health:ping';

@Injectable()
export class HealthRepository implements IHealthRepository, OnModuleDestroy {
  // BullMQ connects directly to Redis DB 0 (see app.module.ts); checkRedis()
  // below round-trips through the cache adapter instead, which talks to DB
  // 1 (build-cache-redis-url.ts) - two independent ioredis clients against
  // the same server, so pinging one says nothing about the other.
  private readonly queueRedis = new Redis({
    ...parseRedisUrl(process.env.REDIS_URL as string),
    // parseRedisUrl's maxRetriesPerRequest: null is right for BullMQ (fine
    // to wait on a queue) but wrong for a health check, which must report
    // "down" quickly rather than hang forever retrying a single ping.
    maxRetriesPerRequest: 1,
    connectTimeout: 3_000,
    lazyConnect: true,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    @Inject(CACHE) private readonly cache: ICache,
  ) {}

  async checkDatabase(): Promise<boolean> {
    try {
      const result = await this.prismaHealthIndicator.pingCheck(
        'database',
        this.prisma,
      );
      return result.database?.status === 'up';
    } catch {
      return false;
    }
  }

  async checkRedis(): Promise<boolean> {
    try {
      await this.cache.set(REDIS_PING_KEY, 'ok', 5);
      const value = await this.cache.get<string>(REDIS_PING_KEY);
      return value === 'ok';
    } catch {
      return false;
    }
  }

  async checkQueue(): Promise<boolean> {
    try {
      return (await this.queueRedis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  onModuleDestroy(): void {
    this.queueRedis.disconnect();
  }
}
