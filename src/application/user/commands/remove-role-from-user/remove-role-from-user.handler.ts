import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  RoleNotFoundException,
  UserNotFoundException,
} from '@domain/_shared/domain.exception';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { ROLE_REPOSITORY } from '@application/role/role-repository.interface';
import type { IRoleRepository } from '@application/role/role-repository.interface';
import { RemoveRoleFromUserCommand } from './remove-role-from-user.command';

@CommandHandler(RemoveRoleFromUserCommand)
export class RemoveRoleFromUserHandler implements ICommandHandler<
  RemoveRoleFromUserCommand,
  void
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(command: RemoveRoleFromUserCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    const role = await this.roleRepository.findById(command.roleId);
    if (!role) {
      throw new RoleNotFoundException(command.roleId);
    }

    await this.userRepository.removeRole(user.id, role.id);
  }
}
