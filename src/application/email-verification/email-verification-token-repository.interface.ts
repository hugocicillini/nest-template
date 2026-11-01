import { EmailVerificationTokenEntity } from '@domain/email-verification/email-verification-token.entity';
import { TransactionContext } from '@application/_shared/transaction-runner.interface';

export const EMAIL_VERIFICATION_TOKEN_REPOSITORY = Symbol(
  'EMAIL_VERIFICATION_TOKEN_REPOSITORY',
);

export interface IEmailVerificationTokenRepository {
  create(
    token: EmailVerificationTokenEntity,
    tx?: TransactionContext,
  ): Promise<EmailVerificationTokenEntity>;
  findByTokenHash(
    tokenHash: string,
  ): Promise<EmailVerificationTokenEntity | null>;
  markAsUsed(id: string, tx?: TransactionContext): Promise<void>;
  /** Deletes expired or already-used rows; returns the count removed. */
  deleteExpiredOrUsed(): Promise<number>;
}
