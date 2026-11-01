import { mock } from 'jest-mock-extended';
import { PermissionEntity } from '@domain/permission/permission.entity';
import { PermissionNotFoundException } from '@domain/_shared/domain.exception';
import type { IPermissionRepository } from '@application/permission/permission-repository.interface';
import { AuditLogRecorder } from '@application/audit-log/audit-log-recorder.service';
import { DeletePermissionHandler } from './delete-permission.handler';
import { DeletePermissionCommand } from './delete-permission.command';

describe('DeletePermissionHandler', () => {
  let permissionRepository: IPermissionRepository;
  let auditLogRecorder: AuditLogRecorder;
  let handler: DeletePermissionHandler;

  beforeEach(() => {
    permissionRepository = mock<IPermissionRepository>();
    auditLogRecorder = mock<AuditLogRecorder>();
    handler = new DeletePermissionHandler(
      permissionRepository,
      auditLogRecorder,
    );
  });

  it('soft-deletes the permission and records an audit log', async () => {
    const now = new Date();
    const permission = PermissionEntity.create({
      id: 'permission-1',
      name: 'users:write',
      createdAt: now,
      updatedAt: now,
    });
    jest.mocked(permissionRepository.findById).mockResolvedValue(permission);

    await handler.execute(
      new DeletePermissionCommand('permission-1', 'admin-1'),
    );

    expect(permissionRepository.softDelete).toHaveBeenCalledWith(
      'permission-1',
    );
    expect(auditLogRecorder.recordAsync).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: 'permission.deleted',
      resourceType: 'Permission',
      resourceId: 'permission-1',
    });
  });

  it('throws PermissionNotFoundException and records nothing when the permission does not exist', async () => {
    jest.mocked(permissionRepository.findById).mockResolvedValue(null);

    await expect(
      handler.execute(new DeletePermissionCommand('missing-permission')),
    ).rejects.toThrow(PermissionNotFoundException);

    expect(permissionRepository.softDelete).not.toHaveBeenCalled();
    expect(auditLogRecorder.recordAsync).not.toHaveBeenCalled();
  });
});
