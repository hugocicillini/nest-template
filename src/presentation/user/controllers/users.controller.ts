import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PaginatedResult } from '@application/_shared/pagination';
import { UserDto } from '@application/user/dtos/user.dto';
import { ListUsersQuery } from '@application/user/queries/list-users/list-users.query';
import { GetUserQuery } from '@application/user/queries/get-user/get-user.query';
import { UpdateUserCommand } from '@application/user/commands/update-user/update-user.command';
import { ChangePasswordCommand } from '@application/user/commands/change-password/change-password.command';
import { DeleteUserCommand } from '@application/user/commands/delete-user/delete-user.command';
import { UpdateUserDto } from '../dtos/update-user.schema';
import { UpdateProfileDto } from '../dtos/update-profile.schema';
import { ChangePasswordDto } from '../dtos/change-password.schema';
import { PaginationQueryDto } from '../../_shared/dtos/pagination-query.schema';
import { CurrentUser } from '../../_shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../_shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../_shared/decorators/permissions.decorator';
import { PermissionsGuard } from '../../_shared/guards/permissions.guard';

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:read')
  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResult<UserDto>> {
    return this.queryBus.execute(new ListUsersQuery(query.page, query.limit));
  }

  @Get('me')
  getMe(@CurrentUser() currentUser: AuthenticatedUser): Promise<UserDto> {
    return this.queryBus.execute(new GetUserQuery(currentUser.id));
  }

  @Patch('me')
  updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.commandBus.execute(
      new UpdateUserCommand(currentUser.id, dto.name, dto.email),
    );
  }

  @Patch('me/password')
  changeMyPassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.commandBus.execute(
      new ChangePasswordCommand(
        currentUser.id,
        dto.currentPassword,
        dto.newPassword,
      ),
    );
  }

  // Must be declared before the :userId routes below - Nest/Express match
  // routes in registration order, so 'me' would otherwise be captured as a
  // literal :userId value first.
  @Delete('me')
  deleteMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.commandBus.execute(
      new DeleteUserCommand(currentUser.id, currentUser.id),
    );
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:read')
  @Get(':userId')
  getById(@Param('userId') userId: string): Promise<UserDto> {
    return this.queryBus.execute(new GetUserQuery(userId));
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:write')
  @Patch(':userId')
  updateById(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    return this.commandBus.execute(
      new UpdateUserCommand(userId, dto.name, dto.email, dto.active),
    );
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:write')
  @Delete(':userId')
  delete(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new DeleteUserCommand(userId, currentUser.id),
    );
  }
}
