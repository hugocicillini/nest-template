import { randomBytes, randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { RefreshTokenEntity } from '@domain/refresh-token/refresh-token.entity';
import { TOKEN_HASHER } from '@application/_shared/token-hasher.interface';
import type { ITokenHasher } from '@application/_shared/token-hasher.interface';
import { REFRESH_TOKEN_REPOSITORY } from './refresh-token-repository.interface';
import type { IRefreshTokenRepository } from './refresh-token-repository.interface';

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Evicting the oldest active session on the (MAX_CONCURRENT_SESSIONS + 1)th
// login is a transparent cap, unlike rejecting the new login outright - a
// legitimate sign-in never fails because of this.
const MAX_CONCURRENT_SESSIONS = 5;

@Injectable()
export class IssueRefreshTokenService {
  constructor(
    @Inject(TOKEN_HASHER) private readonly tokenHasher: ITokenHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async issue(userId: string): Promise<string> {
    await this.evictOldestIfOverLimit(userId);

    const rawToken = randomBytes(32).toString('hex');
    const now = new Date();

    const token = RefreshTokenEntity.create({
      id: randomUUID(),
      userId,
      tokenHash: this.tokenHasher.hash(rawToken),
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      createdAt: now,
    });

    await this.refreshTokenRepository.create(token);

    return rawToken;
  }

  private async evictOldestIfOverLimit(userId: string): Promise<void> {
    const activeTokens =
      await this.refreshTokenRepository.findActiveByUserId(userId);

    if (activeTokens.length < MAX_CONCURRENT_SESSIONS) {
      return;
    }

    const excess = activeTokens.length - MAX_CONCURRENT_SESSIONS + 1;
    const oldestTokens = activeTokens.slice(0, excess);

    await Promise.all(
      oldestTokens.map((token) => this.refreshTokenRepository.revoke(token.id)),
    );
  }
}
