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
import { RemovePermissionFromRoleCommand } from './remove-permission-from-role.command';

@CommandHandler(RemovePermissionFromRoleCommand)
export class RemovePermissionFromRoleHandler implements ICommandHandler<
  RemovePermissionFromRoleCommand,
  void
> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(command: RemovePermissionFromRoleCommand): Promise<void> {
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

    await this.roleRepository.removePermission(role.id, permission.id);
  }
}
