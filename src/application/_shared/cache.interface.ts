export const CACHE = Symbol('CACHE');

export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  /**
   * Atomically increments the counter at `key` by 1 and refreshes its TTL
   * to `ttlSeconds`, avoiding the lost-update race a get-then-set couplet
   * has under concurrent callers. Returns the new value.
   */
  increment(key: string, ttlSeconds: number): Promise<number>;
}
