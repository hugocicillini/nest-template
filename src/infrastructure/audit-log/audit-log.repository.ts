import { Injectable } from '@nestjs/common';
import { AuditLog as PrismaAuditLog, Prisma } from '@generated/prisma';
import { AuditLogEntity } from '@domain/audit-log/audit-log.entity';
import { IAuditLogRepository } from '@application/audit-log/audit-log-repository.interface';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';
import { PrismaService } from '../_shared/prisma.service';

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(log: AuditLogEntity): Promise<AuditLogEntity> {
    const record = await this.prisma.auditLog.create({
      data: {
        id: log.id,
        actorId: log.actorId,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        metadata: log.metadata as Prisma.InputJsonValue,
      },
    });

    return this.toEntity(record);
  }

  async findAll(
    params: PaginationParams,
  ): Promise<PaginatedResult<AuditLogEntity>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      items: records.map((record) => this.toEntity(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toEntity(record: PrismaAuditLog): AuditLogEntity {
    return AuditLogEntity.reconstitute({
      id: record.id,
      actorId: record.actorId,
      action: record.action,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      metadata: record.metadata as Record<string, unknown> | null,
      createdAt: record.createdAt,
    });
  }
}
