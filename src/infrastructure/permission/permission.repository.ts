import { Injectable } from '@nestjs/common';
import { Permission as PrismaPermission } from '@generated/prisma';
import { PermissionEntity } from '@domain/permission/permission.entity';
import { IPermissionRepository } from '@application/permission/permission-repository.interface';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';
import { PrismaService } from '../_shared/prisma.service';

@Injectable()
export class PermissionRepository implements IPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByName(name: string): Promise<PermissionEntity | null> {
    const record = await this.prisma.permission.findFirst({
      where: { name, deletedAt: null },
    });

    return record ? this.toEntity(record) : null;
  }

  async findById(id: string): Promise<PermissionEntity | null> {
    const record = await this.prisma.permission.findFirst({
      where: { id, deletedAt: null },
    });

    return record ? this.toEntity(record) : null;
  }

  async findAll(
    params: PaginationParams,
  ): Promise<PaginatedResult<PermissionEntity>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.permission.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.permission.count({ where: { deletedAt: null } }),
    ]);

    return {
      items: records.map((record) => this.toEntity(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async save(permission: PermissionEntity): Promise<PermissionEntity> {
    const record = await this.prisma.permission.upsert({
      where: { id: permission.id },
      create: {
        id: permission.id,
        name: permission.name,
        description: permission.description,
      },
      update: {
        name: permission.name,
        description: permission.description,
      },
    });

    return this.toEntity(record);
  }

  async nameExists(name: string): Promise<boolean> {
    const count = await this.prisma.permission.count({
      where: { name, deletedAt: null },
    });

    return count > 0;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.permission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private toEntity(record: PrismaPermission): PermissionEntity {
    return PermissionEntity.reconstitute({
      id: record.id,
      name: record.name,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      createdBy: null,
      updatedBy: null,
    });
  }
}
