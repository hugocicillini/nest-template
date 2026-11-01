import { Injectable } from '@nestjs/common';
import {
  EmailVerificationToken as PrismaEmailVerificationToken,
  Prisma,
} from '@generated/prisma';
import { EmailVerificationTokenEntity } from '@domain/email-verification/email-verification-token.entity';
import { IEmailVerificationTokenRepository } from '@application/email-verification/email-verification-token-repository.interface';
import type { TransactionContext } from '@application/_shared/transaction-runner.interface';
import { PrismaService } from '../_shared/prisma.service';

@Injectable()
export class EmailVerificationTokenRepository implements IEmailVerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    token: EmailVerificationTokenEntity,
    tx?: TransactionContext,
  ): Promise<EmailVerificationTokenEntity> {
    const client = (tx as Prisma.TransactionClient) ?? this.prisma;
    const record = await client.emailVerificationToken.create({
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
  ): Promise<EmailVerificationTokenEntity | null> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    return record ? this.toEntity(record) : null;
  }

  async markAsUsed(id: string, tx?: TransactionContext): Promise<void> {
    const client = (tx as Prisma.TransactionClient) ?? this.prisma;
    await client.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteExpiredOrUsed(): Promise<number> {
    const { count } = await this.prisma.emailVerificationToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    });

    return count;
  }

  private toEntity(
    record: PrismaEmailVerificationToken,
  ): EmailVerificationTokenEntity {
    return EmailVerificationTokenEntity.reconstitute({
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    });
  }
}
