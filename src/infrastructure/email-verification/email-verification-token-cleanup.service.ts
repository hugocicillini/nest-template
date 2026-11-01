import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EMAIL_VERIFICATION_TOKEN_REPOSITORY } from '@application/email-verification/email-verification-token-repository.interface';
import type { IEmailVerificationTokenRepository } from '@application/email-verification/email-verification-token-repository.interface';

@Injectable()
export class EmailVerificationTokenCleanupService {
  private readonly logger = new Logger(
    EmailVerificationTokenCleanupService.name,
  );

  constructor(
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly emailVerificationTokenRepository: IEmailVerificationTokenRepository,
  ) {}

  // Offset from the other two cleanup jobs (02:00, 02:10) so all three
  // don't hit Postgres in the same instant.
  @Cron('20 2 * * *')
  async handleCleanup(): Promise<void> {
    const count =
      await this.emailVerificationTokenRepository.deleteExpiredOrUsed();
    this.logger.log(`Deleted ${count} expired/used email verification tokens`);
  }
}
