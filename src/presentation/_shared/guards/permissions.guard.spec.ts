import { mock } from 'jest-mock-extended';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function contextWithUser(permissions: string[] | undefined) {
  const context = mock<ExecutionContext>();
  const request = {
    user: permissions ? { id: 'user-1', permissions } : undefined,
  };
  context.switchToHttp.mockReturnValue({
    getRequest: <T>() => request as T,
    getResponse: jest.fn(),
    getNext: jest.fn(),
  });
  return context;
}

describe('PermissionsGuard', () => {
  let reflector: Reflector;
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = mock<Reflector>();
    guard = new PermissionsGuard(reflector);
  });

  it('allows the request when the route has no @RequirePermissions metadata', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);

    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });

  it('allows the request when the user has one of the required permissions', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(['users:write']);

    expect(
      guard.canActivate(contextWithUser(['users:read', 'users:write'])),
    ).toBe(true);
  });

  it('denies the request when the user lacks every required permission', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(['users:write']);

    expect(guard.canActivate(contextWithUser(['users:read']))).toBe(false);
  });

  it('denies the request when there is no authenticated user at all', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(['users:write']);

    expect(guard.canActivate(contextWithUser(undefined))).toBe(false);
  });
});
