import { Injectable } from '@nestjs/common';
import { Prisma, RefreshToken as PrismaRefreshToken } from '@generated/prisma';
import { RefreshTokenEntity } from '@domain/refresh-token/refresh-token.entity';
import { IRefreshTokenRepository } from '@application/refresh-token/refresh-token-repository.interface';
import type { TransactionContext } from '@application/_shared/transaction-runner.interface';
import { PrismaService } from '../_shared/prisma.service';

@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: RefreshTokenEntity): Promise<RefreshTokenEntity> {
    const record = await this.prisma.refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      },
    });

    return this.toEntity(record);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    return record ? this.toEntity(record) : null;
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(
    userId: string,
    tx?: TransactionContext,
  ): Promise<void> {
    const client = (tx as Prisma.TransactionClient) ?? this.prisma;
    await client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpiredOrRevoked(): Promise<number> {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });

    return count;
  }

  async findActiveByUserId(userId: string): Promise<RefreshTokenEntity[]> {
    const records = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => this.toEntity(record));
  }

  private toEntity(record: PrismaRefreshToken): RefreshTokenEntity {
    return RefreshTokenEntity.reconstitute({
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      createdAt: record.createdAt,
    });
  }
}
