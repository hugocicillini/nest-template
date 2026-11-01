import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  PermissionNotFoundException,
  RoleNotFoundException,
} from '@domain/_shared/domain.exception';
import { ROLE_REPOSITORY } from '@application/role/role-repository.interface';
import type { IRoleRepository } from '@application/role/role-repository.interface';
import { PERMISSION_REPOSITORY } from '@application/permission/permission-repository.interface';
import type { IPermissionRepository } from '@application/permission/permission-repository.interface';
import { AssignPermissionToRoleCommand } from './assign-permission-to-role.command';

@CommandHandler(AssignPermissionToRoleCommand)
export class AssignPermissionToRoleHandler implements ICommandHandler<
  AssignPermissionToRoleCommand,
  void
> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(command: AssignPermissionToRoleCommand): Promise<void> {
    const role = await this.roleRepository.findById(command.roleId);
    if (!role) {
      throw new RoleNotFoundException(command.roleId);
    }

    const permission = await this.permissionRepository.findById(
      command.permissionId,
    );
    if (!permission) {
      throw new PermissionNotFoundException(command.permissionId);
    }

    await this.roleRepository.assignPermission(role.id, permission.id);
  }
}
