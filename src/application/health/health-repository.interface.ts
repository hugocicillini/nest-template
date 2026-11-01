export const HEALTH_REPOSITORY = Symbol('HEALTH_REPOSITORY');

export interface IHealthRepository {
  checkDatabase(): Promise<boolean>;
  checkRedis(): Promise<boolean>;
  checkQueue(): Promise<boolean>;
}
