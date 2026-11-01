import { Injectable } from '@nestjs/common';
import {
  Permission,
  Prisma,
  Role,
  RolePermission,
  User as PrismaUser,
  UserRole,
} from '@generated/prisma';
import { UserEntity } from '@domain/user/user.entity';
import { IUserRepository } from '@application/user/user-repository.interface';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';
import type { TransactionContext } from '@application/_shared/transaction-runner.interface';
import { PrismaService } from '../_shared/prisma.service';

type RoleWithPermissions = Role & {
  permissions: (RolePermission & { permission: Permission })[];
};

type PrismaUserWithRoles = PrismaUser & {
  roles: (UserRole & { role: RoleWithPermissions })[];
};

const rolesInclude = {
  where: { role: { deletedAt: null } },
  include: {
    role: {
      include: {
        permissions: {
          where: { permission: { deletedAt: null } },
          include: { permission: true },
        },
      },
    },
  },
} as const;

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        roles: rolesInclude,
      },
    });

    return record ? this.toEntity(record) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: rolesInclude,
      },
    });

    return record ? this.toEntity(record) : null;
  }

  async save(user: UserEntity, tx?: TransactionContext): Promise<UserEntity> {
    const client = (tx as Prisma.TransactionClient) ?? this.prisma;
    const record = await client.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        active: user.active,
        emailVerifiedAt: user.emailVerifiedAt,
        createdBy: user.createdBy,
        updatedBy: user.updatedBy,
      },
      update: {
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        active: user.active,
        emailVerifiedAt: user.emailVerifiedAt,
        updatedBy: user.updatedBy,
      },
      include: {
        roles: rolesInclude,
      },
    });

    return this.toEntity(record);
  }

  async findAll(
    params: PaginationParams,
  ): Promise<PaginatedResult<UserEntity>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        include: {
          roles: rolesInclude,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return {
      items: records.map((record) => this.toEntity(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        email,
        deletedAt: null,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });

    return count > 0;
  }

  async softDelete(
    id: string,
    deletedBy?: string,
    tx?: TransactionContext,
  ): Promise<void> {
    const client = (tx as Prisma.TransactionClient) ?? this.prisma;
    await client.user.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
    });
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId },
      update: {},
    });
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId },
    });
  }

  private toEntity(record: PrismaUserWithRoles): UserEntity {
    const permissions = new Set<string>();
    for (const userRole of record.roles) {
      for (const rolePermission of userRole.role.permissions) {
        permissions.add(rolePermission.permission.name);
      }
    }

    return UserEntity.reconstitute({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      active: record.active,
      emailVerifiedAt: record.emailVerifiedAt,
      roles: record.roles.map((userRole) => userRole.role.name),
      permissions: [...permissions],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    });
  }
}
