import type { ICache } from '@application/_shared/cache.interface';
import { CACHE } from '@application/_shared/cache.interface';
import type { ITokenHasher } from '@application/_shared/token-hasher.interface';
import { TOKEN_HASHER } from '@application/_shared/token-hasher.interface';
import type { IPasswordResetTokenRepository } from '@application/password-reset/password-reset-token-repository.interface';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '@application/password-reset/password-reset-token-repository.interface';
import type { IRefreshTokenRepository } from '@application/refresh-token/refresh-token-repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from '@application/refresh-token/refresh-token-repository.interface';
import type { IPasswordHasher } from '@application/user/password-hasher.interface';
import { PASSWORD_HASHER } from '@application/user/password-hasher.interface';
import type { IPasswordBreachChecker } from '@application/_shared/password-breach-checker.interface';
import { PASSWORD_BREACH_CHECKER } from '@application/_shared/password-breach-checker.interface';
import type { ITransactionRunner } from '@application/_shared/transaction-runner.interface';
import { TRANSACTION_RUNNER } from '@application/_shared/transaction-runner.interface';
import { userCacheKey } from '@application/user/user-cache-key';
import {
  loginFailureCacheKey,
  loginLockoutEscalationCacheKey,
} from '@application/user/login-lockout';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import {
  InvalidPasswordException,
  InvalidPasswordResetTokenException,
} from '@domain/_shared/domain.exception';
import { Password } from '@domain/user/password.vo';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResetPasswordCommand } from './reset-password.command';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<
  ResetPasswordCommand,
  void
> {
  constructor(
    @Inject(TOKEN_HASHER) private readonly tokenHasher: ITokenHasher,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(CACHE) private readonly cache: ICache,
    @Inject(PASSWORD_BREACH_CHECKER)
    private readonly passwordBreachChecker: IPasswordBreachChecker,
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: ITransactionRunner,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const tokenHash = this.tokenHasher.hash(command.token);
    const existingToken =
      await this.passwordResetTokenRepository.findByTokenHash(tokenHash);

    if (!existingToken || !existingToken.isValid()) {
      throw new InvalidPasswordResetTokenException();
    }

    const user = await this.userRepository.findById(existingToken.userId);
    if (!user) {
      throw new InvalidPasswordResetTokenException();
    }

    // A deactivated account also fails as "invalid token" here, not
    // UserInactiveException/403 - this endpoint is unauthenticated, so it
    // must not reveal account state to whoever is holding the token.
    try {
      user.verifyActive();
    } catch {
      throw new InvalidPasswordResetTokenException();
    }

    Password.validate(command.newPassword);
    if (await this.passwordBreachChecker.isBreached(command.newPassword)) {
      throw new InvalidPasswordException(
        'This password has appeared in a known data breach - choose a different one',
      );
    }
    user.passwordHash = await this.passwordHasher.hash(command.newPassword);
    user.registerUpdate();

    await this.transactionRunner.run(async (tx) => {
      await this.userRepository.save(user, tx);
      await this.passwordResetTokenRepository.markAsUsed(existingToken.id, tx);
      await this.refreshTokenRepository.revokeAllForUser(user.id, tx);
    });

    await this.cache.del(userCacheKey(user.id));
    // A successful reset is a legitimate, self-service recovery path - it
    // must not leave the account locked out from failed login attempts
    // that happened before the user regained access, and proving ownership
    // this way also resets the escalation count from login.handler.ts -
    // whatever caused the repeated lockouts is moot with a new password.
    await this.cache.del(loginFailureCacheKey(user.email));
    await this.cache.del(loginLockoutEscalationCacheKey(user.email));
  }
}
