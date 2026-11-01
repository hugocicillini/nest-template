import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { REFRESH_TOKEN_REPOSITORY } from '@application/refresh-token/refresh-token-repository.interface';
import type { IRefreshTokenRepository } from '@application/refresh-token/refresh-token-repository.interface';

@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  @Cron('0 2 * * *')
  async handleCleanup(): Promise<void> {
    const count = await this.refreshTokenRepository.deleteExpiredOrRevoked();
    this.logger.log(`Deleted ${count} expired/revoked refresh tokens`);
  }
}
