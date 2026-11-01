import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RoleEntity } from '@domain/role/role.entity';
import { PaginatedResult } from '@application/_shared/pagination';
import { ROLE_REPOSITORY } from '@application/role/role-repository.interface';
import type { IRoleRepository } from '@application/role/role-repository.interface';
import { ListRolesQuery } from './list-roles.query';

@QueryHandler(ListRolesQuery)
export class ListRolesHandler implements IQueryHandler<
  ListRolesQuery,
  PaginatedResult<RoleEntity>
> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
  ) {}

  execute(query: ListRolesQuery): Promise<PaginatedResult<RoleEntity>> {
    return this.roleRepository.findAll({
      page: query.page,
      limit: query.limit,
    });
  }
}
