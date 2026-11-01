import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '@application/password-reset/password-reset-token-repository.interface';
import type { IPasswordResetTokenRepository } from '@application/password-reset/password-reset-token-repository.interface';

@Injectable()
export class PasswordResetTokenCleanupService {
  private readonly logger = new Logger(PasswordResetTokenCleanupService.name);

  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
  ) {}

  // Offset from the refresh-token cleanup (02:00) so the two jobs don't hit
  // Postgres in the same instant.
  @Cron('10 2 * * *')
  async handleCleanup(): Promise<void> {
    const count = await this.passwordResetTokenRepository.deleteExpiredOrUsed();
    this.logger.log(`Deleted ${count} expired/used password reset tokens`);
  }
}
