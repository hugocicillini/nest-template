import { PasswordResetTokenEntity } from '@domain/password-reset/password-reset-token.entity';
import { TransactionContext } from '@application/_shared/transaction-runner.interface';

export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol(
  'PASSWORD_RESET_TOKEN_REPOSITORY',
);

export interface IPasswordResetTokenRepository {
  create(token: PasswordResetTokenEntity): Promise<PasswordResetTokenEntity>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenEntity | null>;
  markAsUsed(id: string, tx?: TransactionContext): Promise<void>;
  /** Deletes expired or already-used rows; returns the count removed. */
  deleteExpiredOrUsed(): Promise<number>;
}
