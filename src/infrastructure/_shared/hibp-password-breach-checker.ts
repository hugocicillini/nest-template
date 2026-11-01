import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { IPasswordBreachChecker } from '@application/_shared/password-breach-checker.interface';

const REQUEST_TIMEOUT_MS = 3_000;

/**
 * IPasswordBreachChecker adapter backed by HaveIBeenPwned's Pwned Passwords
 * API, using k-anonymity - only the first 5 hex chars of the password's
 * SHA-1 hash ever leave this process, never the password or its full hash.
 * This specific endpoint is free and needs no API key.
 */
@Injectable()
export class HibpPasswordBreachChecker implements IPasswordBreachChecker {
  private readonly logger = new Logger(HibpPasswordBreachChecker.name);

  async isBreached(password: string): Promise<boolean> {
    const hash = createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    try {
      const response = await fetch(
        `https://api.pwnedpasswords.com/range/${prefix}`,
        { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
      );

      if (!response.ok) {
        throw new Error(`HIBP returned ${response.status}`);
      }

      const body = await response.text();
      return body.split('\n').some((line) => line.split(':')[0] === suffix);
    } catch (error) {
      // Fails open: a breach-list outage must not block registration/reset
      // outright - the existing complexity rule is already a real baseline,
      // this is defense in depth on top of it, not the only line of
      // defense.
      this.logger.warn(
        `HIBP check failed, allowing the password through: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
