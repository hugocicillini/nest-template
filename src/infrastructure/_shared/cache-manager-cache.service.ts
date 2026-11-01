import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import Redis from 'ioredis';
import { ICache } from '@application/_shared/cache.interface';
import { parseRedisUrl } from './parse-redis-url';

@Injectable()
export class CacheManagerCache implements ICache, OnModuleDestroy {
  // cache-manager's Cache (used for get/set/del below) is an intentionally
  // storage-agnostic abstraction with no INCR primitive - a dedicated
  // ioredis client, pointed at the same Redis as the rest of this class,
  // is the only way to get atomic increment.
  private readonly redis = new Redis({
    ...parseRedisUrl(process.env.CACHE_REDIS_URL as string),
    // Same reasoning as HealthRepository's queueRedis - a Redis outage must
    // fail fast, not hang every increment forever.
    maxRetriesPerRequest: 1,
    connectTimeout: 3_000,
    lazyConnect: true,
  });

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    return (await this.cache.get<T>(key)) ?? null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.cache.set(key, value, ttlSeconds * 1000);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.redis.incr(key);
    await this.redis.expire(key, ttlSeconds);
    return count;
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
