import { InvalidPasswordException } from '../_shared/domain.exception';

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /\d/;

export class Password {
  private constructor(private readonly hash: string) {}

  /**
   * Mirrors the Zod-level passwordSchema (same rules, same DTO error
   * message a caller would already see) - this is the domain's own
   * invariant, enforced independently of whatever validated the request on
   * its way in, so the entity can never end up holding an invalid
   * password regardless of which caller reaches it.
   */
  static validate(plainPassword: string): void {
    if (plainPassword.length < MIN_LENGTH) {
      throw new InvalidPasswordException(
        `Password must be at least ${MIN_LENGTH} characters long`,
      );
    }
    if (plainPassword.length > MAX_LENGTH) {
      throw new InvalidPasswordException(
        `Password must be at most ${MAX_LENGTH} characters long`,
      );
    }
    if (!HAS_UPPERCASE.test(plainPassword)) {
      throw new InvalidPasswordException(
        'Password must contain at least one uppercase letter',
      );
    }
    if (!HAS_LOWERCASE.test(plainPassword)) {
      throw new InvalidPasswordException(
        'Password must contain at least one lowercase letter',
      );
    }
    if (!HAS_NUMBER.test(plainPassword)) {
      throw new InvalidPasswordException(
        'Password must contain at least one number',
      );
    }
  }

  static createFromHash(hash: string): Password {
    return new Password(hash);
  }

  getHash(): string {
    return this.hash;
  }
}
