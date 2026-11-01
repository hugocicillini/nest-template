import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PermissionNotFoundException } from '@domain/_shared/domain.exception';
import { PERMISSION_REPOSITORY } from '@application/permission/permission-repository.interface';
import type { IPermissionRepository } from '@application/permission/permission-repository.interface';
import { AuditLogRecorder } from '@application/audit-log/audit-log-recorder.service';
import { DeletePermissionCommand } from './delete-permission.command';

@CommandHandler(DeletePermissionCommand)
export class DeletePermissionHandler implements ICommandHandler<
  DeletePermissionCommand,
  void
> {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async execute(command: DeletePermissionCommand): Promise<void> {
    const permission = await this.permissionRepository.findById(
      command.permissionId,
    );
    if (!permission) {
      throw new PermissionNotFoundException(command.permissionId);
    }

    await this.permissionRepository.softDelete(permission.id);

    this.auditLogRecorder.recordAsync({
      actorId: command.actorId,
      action: 'permission.deleted',
      resourceType: 'Permission',
      resourceId: permission.id,
    });
  }
}
