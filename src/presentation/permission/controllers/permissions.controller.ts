import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PaginatedResult } from '@application/_shared/pagination';
import { CreatePermissionCommand } from '@application/permission/commands/create-permission/create-permission.command';
import { DeletePermissionCommand } from '@application/permission/commands/delete-permission/delete-permission.command';
import { ListPermissionsQuery } from '@application/permission/queries/list-permissions/list-permissions.query';
import { PermissionEntity } from '@domain/permission/permission.entity';
import { CreatePermissionDto } from '../dtos/create-permission.schema';
import { PaginationQueryDto } from '../../_shared/dtos/pagination-query.schema';
import { CurrentUser } from '../../_shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../_shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../_shared/decorators/permissions.decorator';
import { PermissionsGuard } from '../../_shared/guards/permissions.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @RequirePermissions('permissions:write')
  @Post()
  create(@Body() dto: CreatePermissionDto) {
    return this.commandBus.execute(
      new CreatePermissionCommand(dto.name, dto.description),
    );
  }

  @RequirePermissions('permissions:read')
  @Get()
  list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<PermissionEntity>> {
    return this.queryBus.execute(
      new ListPermissionsQuery(query.page, query.limit),
    );
  }

  @RequirePermissions('permissions:write')
  @Delete(':permissionId')
  delete(
    @Param('permissionId') permissionId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new DeletePermissionCommand(permissionId, currentUser.id),
    );
  }
}
