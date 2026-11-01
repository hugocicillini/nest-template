import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateRoleHandler } from '@application/role/commands/create-role/create-role.handler';
import { DeleteRoleHandler } from '@application/role/commands/delete-role/delete-role.handler';
import { CreatePermissionHandler } from '@application/permission/commands/create-permission/create-permission.handler';
import { DeletePermissionHandler } from '@application/permission/commands/delete-permission/delete-permission.handler';
import { AssignPermissionToRoleHandler } from '@application/role/commands/assign-permission-to-role/assign-permission-to-role.handler';
import { RemovePermissionFromRoleHandler } from '@application/role/commands/remove-permission-from-role/remove-permission-from-role.handler';
import { AssignRoleToUserHandler } from '@application/user/commands/assign-role-to-user/assign-role-to-user.handler';
import { RemoveRoleFromUserHandler } from '@application/user/commands/remove-role-from-user/remove-role-from-user.handler';
import { ListRolesHandler } from '@application/role/queries/list-roles/list-roles.handler';
import { ListPermissionsHandler } from '@application/permission/queries/list-permissions/list-permissions.handler';
import { ROLE_REPOSITORY } from '@application/role/role-repository.interface';
import { PERMISSION_REPOSITORY } from '@application/permission/permission-repository.interface';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import { RoleRepository } from '@infrastructure/role/role.repository';
import { PermissionRepository } from '@infrastructure/permission/permission.repository';
import { UserRepository } from '@infrastructure/user/user.repository';
import { RolesController } from './role/controllers/roles.controller';
import { PermissionsController } from './permission/controllers/permissions.controller';
import { AuditLogModule } from './audit-log.module';

@Module({
  imports: [CqrsModule, AuditLogModule],
  controllers: [RolesController, PermissionsController],
  providers: [
    CreateRoleHandler,
    DeleteRoleHandler,
    CreatePermissionHandler,
    DeletePermissionHandler,
    AssignPermissionToRoleHandler,
    RemovePermissionFromRoleHandler,
    AssignRoleToUserHandler,
    RemoveRoleFromUserHandler,
    ListRolesHandler,
    ListPermissionsHandler,
    { provide: ROLE_REPOSITORY, useClass: RoleRepository },
    { provide: PERMISSION_REPOSITORY, useClass: PermissionRepository },
    { provide: USER_REPOSITORY, useClass: UserRepository },
  ],
})
export class RolesModule {}
