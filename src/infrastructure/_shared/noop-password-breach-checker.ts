import { Injectable } from '@nestjs/common';
import { IPasswordBreachChecker } from '@application/_shared/password-breach-checker.interface';

/**
 * Default IPasswordBreachChecker adapter: never flags anything, no network
 * dependency. Swap for HibpPasswordBreachChecker to actually check against
 * HaveIBeenPwned's Pwned Passwords list.
 */
@Injectable()
export class NoopPasswordBreachChecker implements IPasswordBreachChecker {
  isBreached(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
