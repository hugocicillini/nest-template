import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshTokenNotFoundException } from '@domain/_shared/domain.exception';
import { REFRESH_TOKEN_REPOSITORY } from '@application/refresh-token/refresh-token-repository.interface';
import type { IRefreshTokenRepository } from '@application/refresh-token/refresh-token-repository.interface';
import { RevokeSessionCommand } from './revoke-session.command';

@CommandHandler(RevokeSessionCommand)
export class RevokeSessionHandler implements ICommandHandler<
  RevokeSessionCommand,
  void
> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(command: RevokeSessionCommand): Promise<void> {
    // Scoped through the caller's own active sessions rather than a direct
    // findById - the only way to revoke someone else's session would be to
    // guess their session id, and this makes that guess useless instead of
    // needing a separate ownership check after the fact.
    const sessions = await this.refreshTokenRepository.findActiveByUserId(
      command.userId,
    );
    const session = sessions.find((s) => s.id === command.sessionId);

    if (!session) {
      throw new RefreshTokenNotFoundException(command.sessionId);
    }

    await this.refreshTokenRepository.revoke(session.id);
  }
}
