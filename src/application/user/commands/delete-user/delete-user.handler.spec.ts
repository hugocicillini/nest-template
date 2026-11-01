import { mock } from 'jest-mock-extended';
import { UserEntity } from '@domain/user/user.entity';
import { UserNotFoundException } from '@domain/_shared/domain.exception';
import type { IUserRepository } from '@application/user/user-repository.interface';
import type { IRefreshTokenRepository } from '@application/refresh-token/refresh-token-repository.interface';
import type { ICache } from '@application/_shared/cache.interface';
import type { ITransactionRunner } from '@application/_shared/transaction-runner.interface';
import { userCacheKey } from '@application/user/user-cache-key';
import { AuditLogRecorder } from '@application/audit-log/audit-log-recorder.service';
import { DeleteUserHandler } from './delete-user.handler';
import { DeleteUserCommand } from './delete-user.command';

describe('DeleteUserHandler', () => {
  let userRepository: IUserRepository;
  let refreshTokenRepository: IRefreshTokenRepository;
  let cache: ICache;
  let transactionRunner: ITransactionRunner;
  let auditLogRecorder: AuditLogRecorder;
  let handler: DeleteUserHandler;

  beforeEach(() => {
    userRepository = mock<IUserRepository>();
    refreshTokenRepository = mock<IRefreshTokenRepository>();
    cache = mock<ICache>();
    transactionRunner = mock<ITransactionRunner>();
    jest
      .mocked(transactionRunner.run)
      .mockImplementation((work) => work(undefined));
    auditLogRecorder = mock<AuditLogRecorder>();
    handler = new DeleteUserHandler(
      userRepository,
      refreshTokenRepository,
      cache,
      transactionRunner,
      auditLogRecorder,
    );
  });

  it('soft-deletes, invalidates the cache, and records an audit log', async () => {
    const now = new Date();
    const user = UserEntity.create({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
      passwordHash: 'hashed',
      createdAt: now,
      updatedAt: now,
    });
    jest.mocked(userRepository.findById).mockResolvedValue(user);

    await handler.execute(new DeleteUserCommand('user-1', 'admin-1'));

    expect(userRepository.softDelete).toHaveBeenCalledWith(
      'user-1',
      undefined,
      undefined,
    );
    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
      'user-1',
      undefined,
    );
    expect(cache.del).toHaveBeenCalledWith(userCacheKey('user-1'));
    expect(auditLogRecorder.recordAsync).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: 'user.deleted',
      resourceType: 'User',
      resourceId: 'user-1',
    });
  });

  it('throws UserNotFoundException and does nothing else when the user does not exist', async () => {
    jest.mocked(userRepository.findById).mockResolvedValue(null);

    await expect(
      handler.execute(new DeleteUserCommand('missing-user')),
    ).rejects.toThrow(UserNotFoundException);

    expect(userRepository.softDelete).not.toHaveBeenCalled();
    expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
    expect(cache.del).not.toHaveBeenCalled();
    expect(auditLogRecorder.recordAsync).not.toHaveBeenCalled();
  });
});
