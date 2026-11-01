import { mock } from 'jest-mock-extended';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextWithUser(roles: string[] | undefined) {
  const context = mock<ExecutionContext>();
  const request = { user: roles ? { id: 'user-1', roles } : undefined };
  context.switchToHttp.mockReturnValue({
    getRequest: <T>() => request as T,
    getResponse: jest.fn(),
    getNext: jest.fn(),
  });
  return context;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = mock<Reflector>();
    guard = new RolesGuard(reflector);
  });

  it('allows the request when the route has no @Roles metadata', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);

    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });

  it('allows the request when the user has one of the required roles', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(['admin']);

    expect(guard.canActivate(contextWithUser(['admin', 'support']))).toBe(true);
  });

  it('denies the request when the user lacks every required role', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(['admin']);

    expect(guard.canActivate(contextWithUser(['support']))).toBe(false);
  });

  it('denies the request when there is no authenticated user at all', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(['admin']);

    expect(guard.canActivate(contextWithUser(undefined))).toBe(false);
  });
});
