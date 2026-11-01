import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserNotFoundException } from '@domain/_shared/domain.exception';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from '@application/refresh-token/refresh-token-repository.interface';
import type { IRefreshTokenRepository } from '@application/refresh-token/refresh-token-repository.interface';
import { AuditLogRecorder } from '@application/audit-log/audit-log-recorder.service';
import { CACHE } from '@application/_shared/cache.interface';
import type { ICache } from '@application/_shared/cache.interface';
import { TRANSACTION_RUNNER } from '@application/_shared/transaction-runner.interface';
import type { ITransactionRunner } from '@application/_shared/transaction-runner.interface';
import { userCacheKey } from '@application/user/user-cache-key';
import { DeleteUserCommand } from './delete-user.command';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<
  DeleteUserCommand,
  void
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(CACHE) private readonly cache: ICache,
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: ITransactionRunner,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    await this.transactionRunner.run(async (tx) => {
      await this.userRepository.softDelete(user.id, undefined, tx);
      // A deleted account - self-service or admin-initiated - must not leave
      // any existing session usable for as long as its refresh token would
      // otherwise stay valid.
      await this.refreshTokenRepository.revokeAllForUser(user.id, tx);
    });

    await this.cache.del(userCacheKey(user.id));

    this.auditLogRecorder.recordAsync({
      actorId: command.actorId,
      action: 'user.deleted',
      resourceType: 'User',
      resourceId: user.id,
    });
  }
}
