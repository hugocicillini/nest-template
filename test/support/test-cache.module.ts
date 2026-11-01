import { Global, Module } from '@nestjs/common';
import { CACHE } from '@application/_shared/cache.interface';
import { FakeCache } from './fake-cache';

/**
 * Replaces AppCacheModule in tests: no Keyv/Redis client is ever
 * constructed, so tests never need a real Redis reachable. See
 * create-test-app.ts for why overrideModule (not overrideProvider) is
 * required here.
 */
@Global()
@Module({
  providers: [{ provide: CACHE, useClass: FakeCache }],
  exports: [CACHE],
})
export class TestCacheModule {}
