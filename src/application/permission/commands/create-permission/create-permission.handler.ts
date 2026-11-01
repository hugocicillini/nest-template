import { randomUUID } from 'crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PermissionEntity } from '@domain/permission/permission.entity';
import { PermissionAlreadyExistsException } from '@domain/_shared/domain.exception';
import { PERMISSION_REPOSITORY } from '@application/permission/permission-repository.interface';
import type { IPermissionRepository } from '@application/permission/permission-repository.interface';
import { CreatePermissionCommand } from './create-permission.command';

@CommandHandler(CreatePermissionCommand)
export class CreatePermissionHandler implements ICommandHandler<
  CreatePermissionCommand,
  { id: string }
> {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(command: CreatePermissionCommand): Promise<{ id: string }> {
    if (await this.permissionRepository.nameExists(command.name)) {
      throw new PermissionAlreadyExistsException(command.name);
    }

    const now = new Date();
    const permission = PermissionEntity.create({
      id: randomUUID(),
      name: command.name,
      description: command.description,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.permissionRepository.save(permission);

    return { id: saved.id };
  }
}
