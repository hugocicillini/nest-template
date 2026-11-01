import { randomUUID } from 'crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RoleEntity } from '@domain/role/role.entity';
import { RoleAlreadyExistsException } from '@domain/_shared/domain.exception';
import { ROLE_REPOSITORY } from '@application/role/role-repository.interface';
import type { IRoleRepository } from '@application/role/role-repository.interface';
import { CreateRoleCommand } from './create-role.command';

@CommandHandler(CreateRoleCommand)
export class CreateRoleHandler implements ICommandHandler<
  CreateRoleCommand,
  { id: string }
> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(command: CreateRoleCommand): Promise<{ id: string }> {
    if (await this.roleRepository.nameExists(command.name)) {
      throw new RoleAlreadyExistsException(command.name);
    }

    const now = new Date();
    const role = RoleEntity.create({
      id: randomUUID(),
      name: command.name,
      description: command.description,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.roleRepository.save(role);

    return { id: saved.id };
  }
}
