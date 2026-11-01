import { IssueRefreshTokenService } from '@application/refresh-token/issue-refresh-token.service';
import type { ICache } from '@application/_shared/cache.interface';
import { CACHE } from '@application/_shared/cache.interface';
import type { IPasswordHasher } from '@application/user/password-hasher.interface';
import { PASSWORD_HASHER } from '@application/user/password-hasher.interface';
import type { ITokenService } from '@application/user/token-service.interface';
import { TOKEN_SERVICE } from '@application/user/token-service.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import {
  ESCALATED_LOCKOUT_WINDOW_SECONDS,
  LOCKOUT_ESCALATION_TRACKING_WINDOW_SECONDS,
  LOCKOUTS_BEFORE_ESCALATION,
  LOGIN_LOCKOUT_WINDOW_SECONDS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  loginFailureCacheKey,
  loginLockoutEscalationCacheKey,
} from '@application/user/login-lockout';
import {
  AccountLockedException,
  InvalidCredentialsException,
} from '@domain/_shared/domain.exception';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LoginCommand } from './login.command';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<
  LoginCommand,
  LoginResult
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(CACHE) private readonly cache: ICache,
    private readonly issueRefreshTokenService: IssueRefreshTokenService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const failureKey = loginFailureCacheKey(command.email);
    const failures = (await this.cache.get<number>(failureKey)) ?? 0;

    if (failures >= MAX_FAILED_LOGIN_ATTEMPTS) {
      throw new AccountLockedException();
    }

    const user = await this.userRepository.findByEmail(command.email);

    if (!user) {
      await this.recordFailure(failureKey, command.email);
      throw new InvalidCredentialsException();
    }

    user.verifyActive();

    const passwordMatches = await this.passwordHasher.compare(
      command.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      await this.recordFailure(failureKey, command.email);
      throw new InvalidCredentialsException();
    }

    await this.cache.del(failureKey);

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateToken(user),
      this.issueRefreshTokenService.issue(user.id),
    ]);

    return { accessToken, refreshToken };
  }

  private async recordFailure(key: string, email: string): Promise<void> {
    // Atomic INCR (with the window refreshed on every call) instead of a
    // get-then-set couplet - concurrent failed attempts on the same account
    // would otherwise race, each reading the same stale count and losing
    // all but one of the increments.
    const nextCount = await this.cache.increment(
      key,
      LOGIN_LOCKOUT_WINDOW_SECONDS,
    );

    if (nextCount !== MAX_FAILED_LOGIN_ATTEMPTS) {
      // Either still under the limit, or a concurrent request that landed
      // after another one already crossed the threshold below - that
      // request already recorded the (possibly escalated) lockout window,
      // so there's nothing further to do here.
      return;
    }

    // This failure is the one crossing the threshold into a fresh lockout -
    // escalate its duration if the account has already been locked out
    // repeatedly (see login-lockout.ts for why).
    const escalationKey = loginLockoutEscalationCacheKey(email);
    const lockoutCount = await this.cache.increment(
      escalationKey,
      LOCKOUT_ESCALATION_TRACKING_WINDOW_SECONDS,
    );

    const lockoutWindow =
      lockoutCount >= LOCKOUTS_BEFORE_ESCALATION
        ? ESCALATED_LOCKOUT_WINDOW_SECONDS
        : LOGIN_LOCKOUT_WINDOW_SECONDS;

    await this.cache.set(key, nextCount, lockoutWindow);
  }
}
