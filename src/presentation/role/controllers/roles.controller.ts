import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PaginatedResult } from '@application/_shared/pagination';
import { CreateRoleCommand } from '@application/role/commands/create-role/create-role.command';
import { DeleteRoleCommand } from '@application/role/commands/delete-role/delete-role.command';
import { AssignPermissionToRoleCommand } from '@application/role/commands/assign-permission-to-role/assign-permission-to-role.command';
import { RemovePermissionFromRoleCommand } from '@application/role/commands/remove-permission-from-role/remove-permission-from-role.command';
import { AssignRoleToUserCommand } from '@application/user/commands/assign-role-to-user/assign-role-to-user.command';
import { RemoveRoleFromUserCommand } from '@application/user/commands/remove-role-from-user/remove-role-from-user.command';
import { ListRolesQuery } from '@application/role/queries/list-roles/list-roles.query';
import { RoleEntity } from '@domain/role/role.entity';
import { CreateRoleDto } from '../dtos/create-role.schema';
import { AssignPermissionDto } from '../dtos/assign-permission.schema';
import { PaginationQueryDto } from '../../_shared/dtos/pagination-query.schema';
import { CurrentUser } from '../../_shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../_shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../_shared/decorators/permissions.decorator';
import { PermissionsGuard } from '../../_shared/guards/permissions.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @RequirePermissions('roles:write')
  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.commandBus.execute(
      new CreateRoleCommand(dto.name, dto.description),
    );
  }

  @RequirePermissions('roles:read')
  @Get()
  list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<RoleEntity>> {
    return this.queryBus.execute(new ListRolesQuery(query.page, query.limit));
  }

  @RequirePermissions('roles:write')
  @Delete(':roleId')
  delete(
    @Param('roleId') roleId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new DeleteRoleCommand(roleId, currentUser.id),
    );
  }

  @RequirePermissions('roles:write')
  @Post(':roleId/permissions')
  assignPermission(
    @Param('roleId') roleId: string,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.commandBus.execute(
      new AssignPermissionToRoleCommand(roleId, dto.permissionId),
    );
  }

  @RequirePermissions('roles:write')
  @Delete(':roleId/permissions/:permissionId')
  removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.commandBus.execute(
      new RemovePermissionFromRoleCommand(roleId, permissionId),
    );
  }

  @RequirePermissions('roles:write')
  @Post(':roleId/users/:userId')
  assignToUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ) {
    return this.commandBus.execute(new AssignRoleToUserCommand(userId, roleId));
  }

  @RequirePermissions('roles:write')
  @Delete(':roleId/users/:userId')
  removeFromUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ) {
    return this.commandBus.execute(
      new RemoveRoleFromUserCommand(userId, roleId),
    );
  }
}
