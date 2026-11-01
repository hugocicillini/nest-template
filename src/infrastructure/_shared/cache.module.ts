import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { CACHE } from '@application/_shared/cache.interface';
import { CacheManagerCache } from './cache-manager-cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: () => ({
        stores: [createKeyv(process.env.CACHE_REDIS_URL as string)],
      }),
    }),
  ],
  providers: [{ provide: CACHE, useClass: CacheManagerCache }],
  exports: [CACHE],
})
export class AppCacheModule {}
