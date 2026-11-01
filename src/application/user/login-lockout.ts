// IP-based throttling (@Throttle on the auth controller) already limits raw
// request volume; this adds a second, per-account layer that survives a
// distributed attack spread across many IPs targeting one known email.
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;

// A rolling 15-minute lock alone lets an attacker keep one account
// perpetually inaccessible for a handful of cheap requests every 15
// minutes, by relocking it again the instant it expires. After enough
// relocks within a day, escalate the lock itself to something that
// actually costs the attacker time - a legitimate user who just forgot
// their password never notices, since password reset clears both counters.
export const LOCKOUTS_BEFORE_ESCALATION = 3;
export const LOCKOUT_ESCALATION_TRACKING_WINDOW_SECONDS = 24 * 60 * 60;
export const ESCALATED_LOCKOUT_WINDOW_SECONDS = 24 * 60 * 60;

export function loginFailureCacheKey(email: string): string {
  return `login:failures:${email.toLowerCase()}`;
}

export function loginLockoutEscalationCacheKey(email: string): string {
  return `login:lockout-escalations:${email.toLowerCase()}`;
}
