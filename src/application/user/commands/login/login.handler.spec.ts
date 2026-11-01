import { mock } from 'jest-mock-extended';
import { UserEntity } from '@domain/user/user.entity';
import {
  AccountLockedException,
  InvalidCredentialsException,
} from '@domain/_shared/domain.exception';
import type { IUserRepository } from '@application/user/user-repository.interface';
import type { IPasswordHasher } from '@application/user/password-hasher.interface';
import type { ITokenService } from '@application/user/token-service.interface';
import type { ICache } from '@application/_shared/cache.interface';
import { IssueRefreshTokenService } from '@application/refresh-token/issue-refresh-token.service';
import {
  ESCALATED_LOCKOUT_WINDOW_SECONDS,
  LOCKOUT_ESCALATION_TRACKING_WINDOW_SECONDS,
  LOCKOUTS_BEFORE_ESCALATION,
  LOGIN_LOCKOUT_WINDOW_SECONDS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  loginFailureCacheKey,
  loginLockoutEscalationCacheKey,
} from '@application/user/login-lockout';
import { LoginHandler } from './login.handler';
import { LoginCommand } from './login.command';

describe('LoginHandler', () => {
  let userRepository: IUserRepository;
  let passwordHasher: IPasswordHasher;
  let tokenService: ITokenService;
  let cache: ICache;
  let issueRefreshTokenService: IssueRefreshTokenService;
  let handler: LoginHandler;

  const email = 'user@example.com';
  const failureKey = loginFailureCacheKey(email);
  const escalationKey = loginLockoutEscalationCacheKey(email);

  function buildUser(): UserEntity {
    const now = new Date();
    return UserEntity.create({
      id: 'user-1',
      name: 'Test User',
      email,
      passwordHash: 'hashed',
      createdAt: now,
      updatedAt: now,
    });
  }

  beforeEach(() => {
    userRepository = mock<IUserRepository>();
    passwordHasher = mock<IPasswordHasher>();
    tokenService = mock<ITokenService>();
    cache = mock<ICache>();
    issueRefreshTokenService = mock<IssueRefreshTokenService>();
    handler = new LoginHandler(
      userRepository,
      passwordHasher,
      tokenService,
      cache,
      issueRefreshTokenService,
    );
  });

  it('throws AccountLockedException without checking credentials once the failure count is at the limit', async () => {
    jest.mocked(cache.get).mockResolvedValue(MAX_FAILED_LOGIN_ATTEMPTS);

    await expect(
      handler.execute(new LoginCommand(email, 'password')),
    ).rejects.toThrow(AccountLockedException);

    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('records a wrong password with an atomic increment, not a get-then-set', async () => {
    jest.mocked(cache.get).mockResolvedValue(2);
    jest.mocked(userRepository.findByEmail).mockResolvedValue(buildUser());
    jest.mocked(passwordHasher.compare).mockResolvedValue(false);
    jest.mocked(cache.increment).mockResolvedValue(3);

    await expect(
      handler.execute(new LoginCommand(email, 'wrong-password')),
    ).rejects.toThrow(InvalidCredentialsException);

    expect(cache.increment).toHaveBeenCalledWith(
      failureKey,
      LOGIN_LOCKOUT_WINDOW_SECONDS,
    );
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('crossing the failure threshold for the first time locks with the normal window', async () => {
    jest.mocked(cache.get).mockResolvedValue(MAX_FAILED_LOGIN_ATTEMPTS - 1);
    jest.mocked(userRepository.findByEmail).mockResolvedValue(buildUser());
    jest.mocked(passwordHasher.compare).mockResolvedValue(false);
    jest
      .mocked(cache.increment)
      .mockResolvedValueOnce(MAX_FAILED_LOGIN_ATTEMPTS)
      .mockResolvedValueOnce(1);

    await expect(
      handler.execute(new LoginCommand(email, 'wrong-password')),
    ).rejects.toThrow(InvalidCredentialsException);

    expect(cache.increment).toHaveBeenNthCalledWith(
      2,
      escalationKey,
      LOCKOUT_ESCALATION_TRACKING_WINDOW_SECONDS,
    );
    expect(cache.set).toHaveBeenCalledWith(
      failureKey,
      MAX_FAILED_LOGIN_ATTEMPTS,
      LOGIN_LOCKOUT_WINDOW_SECONDS,
    );
  });

  it('crossing the failure threshold after repeated lockouts escalates the window', async () => {
    jest.mocked(cache.get).mockResolvedValue(MAX_FAILED_LOGIN_ATTEMPTS - 1);
    jest.mocked(userRepository.findByEmail).mockResolvedValue(buildUser());
    jest.mocked(passwordHasher.compare).mockResolvedValue(false);
    jest
      .mocked(cache.increment)
      .mockResolvedValueOnce(MAX_FAILED_LOGIN_ATTEMPTS)
      .mockResolvedValueOnce(LOCKOUTS_BEFORE_ESCALATION);

    await expect(
      handler.execute(new LoginCommand(email, 'wrong-password')),
    ).rejects.toThrow(InvalidCredentialsException);

    expect(cache.set).toHaveBeenCalledWith(
      failureKey,
      MAX_FAILED_LOGIN_ATTEMPTS,
      ESCALATED_LOCKOUT_WINDOW_SECONDS,
    );
  });

  it('a concurrent attempt landing past the threshold does not re-trigger escalation', async () => {
    jest.mocked(cache.get).mockResolvedValue(MAX_FAILED_LOGIN_ATTEMPTS - 1);
    jest.mocked(userRepository.findByEmail).mockResolvedValue(buildUser());
    jest.mocked(passwordHasher.compare).mockResolvedValue(false);
    jest
      .mocked(cache.increment)
      .mockResolvedValue(MAX_FAILED_LOGIN_ATTEMPTS + 1);

    await expect(
      handler.execute(new LoginCommand(email, 'wrong-password')),
    ).rejects.toThrow(InvalidCredentialsException);

    expect(cache.increment).toHaveBeenCalledTimes(1);
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('logs in successfully and clears the failure counter', async () => {
    jest.mocked(cache.get).mockResolvedValue(0);
    jest.mocked(userRepository.findByEmail).mockResolvedValue(buildUser());
    jest.mocked(passwordHasher.compare).mockResolvedValue(true);
    jest.mocked(tokenService.generateToken).mockResolvedValue('access-token');
    jest
      .mocked(issueRefreshTokenService.issue)
      .mockResolvedValue('refresh-token');

    const result = await handler.execute(
      new LoginCommand(email, 'correct-password'),
    );

    expect(cache.del).toHaveBeenCalledWith(failureKey);
    expect(cache.increment).not.toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });
});
