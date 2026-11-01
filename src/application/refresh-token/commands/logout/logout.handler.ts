import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TOKEN_HASHER } from '@application/_shared/token-hasher.interface';
import type { ITokenHasher } from '@application/_shared/token-hasher.interface';
import { REFRESH_TOKEN_REPOSITORY } from '@application/refresh-token/refresh-token-repository.interface';
import type { IRefreshTokenRepository } from '@application/refresh-token/refresh-token-repository.interface';
import { LogoutCommand } from './logout.command';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  constructor(
    @Inject(TOKEN_HASHER) private readonly tokenHasher: ITokenHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const tokenHash = this.tokenHasher.hash(command.refreshToken);
    const existingToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (existingToken) {
      await this.refreshTokenRepository.revoke(existingToken.id);
    }
  }
}
