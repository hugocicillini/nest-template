import { mock } from 'jest-mock-extended';
import { RoleEntity } from '@domain/role/role.entity';
import { RoleNotFoundException } from '@domain/_shared/domain.exception';
import type { IRoleRepository } from '@application/role/role-repository.interface';
import { AuditLogRecorder } from '@application/audit-log/audit-log-recorder.service';
import { DeleteRoleHandler } from './delete-role.handler';
import { DeleteRoleCommand } from './delete-role.command';

describe('DeleteRoleHandler', () => {
  let roleRepository: IRoleRepository;
  let auditLogRecorder: AuditLogRecorder;
  let handler: DeleteRoleHandler;

  beforeEach(() => {
    roleRepository = mock<IRoleRepository>();
    auditLogRecorder = mock<AuditLogRecorder>();
    handler = new DeleteRoleHandler(roleRepository, auditLogRecorder);
  });

  it('soft-deletes the role and records an audit log', async () => {
    const now = new Date();
    const role = RoleEntity.create({
      id: 'role-1',
      name: 'editor',
      createdAt: now,
      updatedAt: now,
    });
    jest.mocked(roleRepository.findById).mockResolvedValue(role);

    await handler.execute(new DeleteRoleCommand('role-1', 'admin-1'));

    expect(roleRepository.softDelete).toHaveBeenCalledWith('role-1');
    expect(auditLogRecorder.recordAsync).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: 'role.deleted',
      resourceType: 'Role',
      resourceId: 'role-1',
    });
  });

  it('throws RoleNotFoundException and records nothing when the role does not exist', async () => {
    jest.mocked(roleRepository.findById).mockResolvedValue(null);

    await expect(
      handler.execute(new DeleteRoleCommand('missing-role')),
    ).rejects.toThrow(RoleNotFoundException);

    expect(roleRepository.softDelete).not.toHaveBeenCalled();
    expect(auditLogRecorder.recordAsync).not.toHaveBeenCalled();
  });
});
