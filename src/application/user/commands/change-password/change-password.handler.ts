import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  InvalidCredentialsException,
  InvalidPasswordException,
  UserNotFoundException,
} from '@domain/_shared/domain.exception';
import { Password } from '@domain/user/password.vo';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { PASSWORD_HASHER } from '@application/user/password-hasher.interface';
import type { IPasswordHasher } from '@application/user/password-hasher.interface';
import { PASSWORD_BREACH_CHECKER } from '@application/_shared/password-breach-checker.interface';
import type { IPasswordBreachChecker } from '@application/_shared/password-breach-checker.interface';
import { REFRESH_TOKEN_REPOSITORY } from '@application/refresh-token/refresh-token-repository.interface';
import type { IRefreshTokenRepository } from '@application/refresh-token/refresh-token-repository.interface';
import { CACHE } from '@application/_shared/cache.interface';
import type { ICache } from '@application/_shared/cache.interface';
import { userCacheKey } from '@application/user/user-cache-key';
import { ChangePasswordCommand } from './change-password.command';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<
  ChangePasswordCommand,
  void
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(CACHE) private readonly cache: ICache,
    @Inject(PASSWORD_BREACH_CHECKER)
    private readonly passwordBreachChecker: IPasswordBreachChecker,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    const currentPasswordMatches = await this.passwordHasher.compare(
      command.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatches) {
      throw new InvalidCredentialsException();
    }

    Password.validate(command.newPassword);
    if (await this.passwordBreachChecker.isBreached(command.newPassword)) {
      throw new InvalidPasswordException(
        'This password has appeared in a known data breach - choose a different one',
      );
    }
    user.passwordHash = await this.passwordHasher.hash(command.newPassword);
    user.registerUpdate();

    await this.userRepository.save(user);
    await this.cache.del(userCacheKey(user.id));
    await this.refreshTokenRepository.revokeAllForUser(user.id);
  }
}
