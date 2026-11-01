import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PermissionEntity } from '@domain/permission/permission.entity';
import { PaginatedResult } from '@application/_shared/pagination';
import { PERMISSION_REPOSITORY } from '@application/permission/permission-repository.interface';
import type { IPermissionRepository } from '@application/permission/permission-repository.interface';
import { ListPermissionsQuery } from './list-permissions.query';

@QueryHandler(ListPermissionsQuery)
export class ListPermissionsHandler implements IQueryHandler<
  ListPermissionsQuery,
  PaginatedResult<PermissionEntity>
> {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  execute(
    query: ListPermissionsQuery,
  ): Promise<PaginatedResult<PermissionEntity>> {
    return this.permissionRepository.findAll({
      page: query.page,
      limit: query.limit,
    });
  }
}
