import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RoleNotFoundException } from '@domain/_shared/domain.exception';
import { ROLE_REPOSITORY } from '@application/role/role-repository.interface';
import type { IRoleRepository } from '@application/role/role-repository.interface';
import { AuditLogRecorder } from '@application/audit-log/audit-log-recorder.service';
import { DeleteRoleCommand } from './delete-role.command';

@CommandHandler(DeleteRoleCommand)
export class DeleteRoleHandler implements ICommandHandler<
  DeleteRoleCommand,
  void
> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async execute(command: DeleteRoleCommand): Promise<void> {
    const role = await this.roleRepository.findById(command.roleId);
    if (!role) {
      throw new RoleNotFoundException(command.roleId);
    }

    await this.roleRepository.softDelete(role.id);

    this.auditLogRecorder.recordAsync({
      actorId: command.actorId,
      action: 'role.deleted',
      resourceType: 'Role',
      resourceId: role.id,
    });
  }
}
