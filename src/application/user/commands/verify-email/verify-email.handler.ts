import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InvalidEmailVerificationTokenException } from '@domain/_shared/domain.exception';
import { TOKEN_HASHER } from '@application/_shared/token-hasher.interface';
import type { ITokenHasher } from '@application/_shared/token-hasher.interface';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { EMAIL_VERIFICATION_TOKEN_REPOSITORY } from '@application/email-verification/email-verification-token-repository.interface';
import type { IEmailVerificationTokenRepository } from '@application/email-verification/email-verification-token-repository.interface';
import { CACHE } from '@application/_shared/cache.interface';
import type { ICache } from '@application/_shared/cache.interface';
import { TRANSACTION_RUNNER } from '@application/_shared/transaction-runner.interface';
import type { ITransactionRunner } from '@application/_shared/transaction-runner.interface';
import { userCacheKey } from '@application/user/user-cache-key';
import { VerifyEmailCommand } from './verify-email.command';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<
  VerifyEmailCommand,
  void
> {
  constructor(
    @Inject(TOKEN_HASHER) private readonly tokenHasher: ITokenHasher,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly emailVerificationTokenRepository: IEmailVerificationTokenRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(CACHE) private readonly cache: ICache,
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: ITransactionRunner,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const tokenHash = this.tokenHasher.hash(command.token);
    const existingToken =
      await this.emailVerificationTokenRepository.findByTokenHash(tokenHash);

    if (!existingToken || !existingToken.isValid()) {
      throw new InvalidEmailVerificationTokenException();
    }

    const user = await this.userRepository.findById(existingToken.userId);
    if (!user) {
      throw new InvalidEmailVerificationTokenException();
    }

    user.verifyEmail();
    user.registerUpdate();

    await this.transactionRunner.run(async (tx) => {
      await this.userRepository.save(user, tx);
      await this.emailVerificationTokenRepository.markAsUsed(
        existingToken.id,
        tx,
      );
    });

    await this.cache.del(userCacheKey(user.id));
  }
}
