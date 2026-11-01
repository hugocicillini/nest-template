import { RefreshTokenEntity } from '@domain/refresh-token/refresh-token.entity';
import { TransactionContext } from '@application/_shared/transaction-runner.interface';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface IRefreshTokenRepository {
  create(token: RefreshTokenEntity): Promise<RefreshTokenEntity>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string, tx?: TransactionContext): Promise<void>;
  /** Deletes expired or already-revoked rows; returns the count removed. */
  deleteExpiredOrRevoked(): Promise<number>;
  /** Non-revoked, non-expired tokens for a user, oldest first. */
  findActiveByUserId(userId: string): Promise<RefreshTokenEntity[]>;
}
