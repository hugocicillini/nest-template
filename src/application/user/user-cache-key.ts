export const USER_CACHE_TTL_SECONDS = 300;

export function userCacheKey(userId: string): string {
  return `user:${userId}`;
}
