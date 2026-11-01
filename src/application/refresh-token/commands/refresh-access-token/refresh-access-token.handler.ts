import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InvalidRefreshTokenException } from '@domain/_shared/domain.exception';
import { TOKEN_HASHER } from '@application/_shared/token-hasher.interface';
import type { ITokenHasher } from '@application/_shared/token-hasher.interface';
import { REFRESH_TOKEN_REPOSITORY } from '@application/refresh-token/refresh-token-repository.interface';
import type { IRefreshTokenRepository } from '@application/refresh-token/refresh-token-repository.interface';
import { IssueRefreshTokenService } from '@application/refresh-token/issue-refresh-token.service';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { TOKEN_SERVICE } from '@application/user/token-service.interface';
import type { ITokenService } from '@application/user/token-service.interface';
import { RefreshAccessTokenCommand } from './refresh-access-token.command';

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
}

@CommandHandler(RefreshAccessTokenCommand)
export class RefreshAccessTokenHandler implements ICommandHandler<
  RefreshAccessTokenCommand,
  RefreshedTokens
> {
  constructor(
    @Inject(TOKEN_HASHER) private readonly tokenHasher: ITokenHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    private readonly issueRefreshTokenService: IssueRefreshTokenService,
  ) {}

  async execute(command: RefreshAccessTokenCommand): Promise<RefreshedTokens> {
    const tokenHash = this.tokenHasher.hash(command.refreshToken);
    const existingToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existingToken || !existingToken.isValid()) {
      throw new InvalidRefreshTokenException();
    }

    const user = await this.userRepository.findById(existingToken.userId);
    if (!user) {
      throw new InvalidRefreshTokenException();
    }
    user.verifyActive();

    await this.refreshTokenRepository.revoke(existingToken.id);

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateToken(user),
      this.issueRefreshTokenService.issue(user.id),
    ]);

    return { accessToken, refreshToken };
  }
}
