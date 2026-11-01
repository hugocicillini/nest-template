import type { ICache } from '@application/_shared/cache.interface';
import { UserDto } from '@application/user/dtos/user.dto';
import {
  USER_CACHE_TTL_SECONDS,
  userCacheKey,
} from '@application/user/user-cache-key';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { UserNotFoundException } from '@domain/_shared/domain.exception';
import { UserEntity } from '@domain/user/user.entity';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import { GetUserHandler } from './get-user.handler';
import { GetUserQuery } from './get-user.query';

describe('GetUserHandler', () => {
  let userRepository: IUserRepository;
  let cache: ICache;
  let handler: GetUserHandler;

  beforeEach(() => {
    userRepository = mock<IUserRepository>();
    cache = mock<ICache>();
    handler = new GetUserHandler(userRepository, cache);
  });

  it('returns the cached DTO on a cache hit, never touching the repository', async () => {
    const cached: UserDto = {
      id: 'user-1',
      name: 'Cached User',
      email: 'cached@example.com',
      active: true,
      emailVerified: false,
    };
    jest.mocked(cache.get).mockResolvedValue(cached);

    const result = await handler.execute(new GetUserQuery('user-1'));

    expect(result).toEqual(cached);
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('falls back to the repository on a cache miss and populates the cache', async () => {
    const now = new Date();
    const user = UserEntity.create({
      id: 'user-1',
      name: 'Fresh User',
      email: 'fresh@example.com',
      passwordHash: 'hashed',
      createdAt: now,
      updatedAt: now,
    });

    jest.mocked(cache.get).mockResolvedValue(null);
    jest.mocked(userRepository.findById).mockResolvedValue(user);

    const result = await handler.execute(new GetUserQuery('user-1'));

    expect(result).toEqual({
      id: 'user-1',
      name: 'Fresh User',
      email: 'fresh@example.com',
      active: true,
      emailVerified: false,
    });
    expect(cache.set).toHaveBeenCalledWith(
      userCacheKey('user-1'),
      result,
      USER_CACHE_TTL_SECONDS,
    );
  });

  it('throws UserNotFoundException when the user does not exist', async () => {
    jest.mocked(cache.get).mockResolvedValue(null);
    jest.mocked(userRepository.findById).mockResolvedValue(null);

    await expect(
      handler.execute(new GetUserQuery('missing-user')),
    ).rejects.toThrow(UserNotFoundException);
  });
});
