import { Injectable } from '@nestjs/common';
import {
  PasswordResetToken as PrismaPasswordResetToken,
  Prisma,
} from '@generated/prisma';
import { PasswordResetTokenEntity } from '@domain/password-reset/password-reset-token.entity';
import { IPasswordResetTokenRepository } from '@application/password-reset/password-reset-token-repository.interface';
import type { TransactionContext } from '@application/_shared/transaction-runner.interface';
import { PrismaService } from '../_shared/prisma.service';

@Injectable()
export class PasswordResetTokenRepository implements IPasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    token: PasswordResetTokenEntity,
  ): Promise<PasswordResetTokenEntity> {
    const record = await this.prisma.passwordResetToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      },
    });

    return this.toEntity(record);
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenEntity | null> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    return record ? this.toEntity(record) : null;
  }

  async markAsUsed(id: string, tx?: TransactionContext): Promise<void> {
    const client = (tx as Prisma.TransactionClient) ?? this.prisma;
    await client.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteExpiredOrUsed(): Promise<number> {
    const { count } = await this.prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    });

    return count;
  }

  private toEntity(record: PrismaPasswordResetToken): PasswordResetTokenEntity {
    return PasswordResetTokenEntity.reconstitute({
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    });
  }
}
