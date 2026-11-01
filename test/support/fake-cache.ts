import { ICache } from '@application/_shared/cache.interface';

export class FakeCache implements ICache {
  private readonly store = new Map<string, unknown>();

  get<T>(key: string): Promise<T | null> {
    return Promise.resolve(
      (this.store.has(key) ? (this.store.get(key) as T) : null) ?? null,
    );
  }

  set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }

  del(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  increment(key: string): Promise<number> {
    const next = ((this.store.get(key) as number) ?? 0) + 1;
    this.store.set(key, next);
    return Promise.resolve(next);
  }
}
