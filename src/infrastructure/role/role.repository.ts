import { Injectable } from '@nestjs/common';
import {
  Permission,
  Role as PrismaRole,
  RolePermission,
} from '@generated/prisma';
import { RoleEntity } from '@domain/role/role.entity';
import { IRoleRepository } from '@application/role/role-repository.interface';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';
import { PrismaService } from '../_shared/prisma.service';

type PrismaRoleWithPermissions = PrismaRole & {
  permissions: (RolePermission & { permission: Permission })[];
};

@Injectable()
export class RoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByName(name: string): Promise<RoleEntity | null> {
    const record = await this.prisma.role.findFirst({
      where: { name, deletedAt: null },
      include: {
        permissions: {
          where: { permission: { deletedAt: null } },
          include: { permission: true },
        },
      },
    });

    return record ? this.toEntity(record) : null;
  }

  async findById(id: string): Promise<RoleEntity | null> {
    const record = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: {
        permissions: {
          where: { permission: { deletedAt: null } },
          include: { permission: true },
        },
      },
    });

    return record ? this.toEntity(record) : null;
  }

  async findAll(
    params: PaginationParams,
  ): Promise<PaginatedResult<RoleEntity>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.role.findMany({
        where: { deletedAt: null },
        include: {
          permissions: {
            where: { permission: { deletedAt: null } },
            include: { permission: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.role.count({ where: { deletedAt: null } }),
    ]);

    return {
      items: records.map((record) => this.toEntity(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async save(role: RoleEntity): Promise<RoleEntity> {
    const record = await this.prisma.role.upsert({
      where: { id: role.id },
      create: {
        id: role.id,
        name: role.name,
        description: role.description,
      },
      update: {
        name: role.name,
        description: role.description,
      },
      include: {
        permissions: {
          where: { permission: { deletedAt: null } },
          include: { permission: true },
        },
      },
    });

    return this.toEntity(record);
  }

  async nameExists(name: string): Promise<boolean> {
    const count = await this.prisma.role.count({
      where: { name, deletedAt: null },
    });

    return count > 0;
  }

  async assignPermission(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private toEntity(record: PrismaRoleWithPermissions): RoleEntity {
    return RoleEntity.reconstitute({
      id: record.id,
      name: record.name,
      description: record.description,
      permissions: record.permissions.map((rp) => rp.permission.name),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      createdBy: null,
      updatedBy: null,
    });
  }
}
