import { mock } from 'jest-mock-extended';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '@domain/user/user.entity';
import { UserInactiveException } from '@domain/_shared/domain.exception';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { JwtStrategy } from './jwt.strategy';
import type { JwtPayload } from './jwt-token.service';

describe('JwtStrategy', () => {
  let userRepository: IUserRepository;
  let strategy: JwtStrategy;

  beforeEach(() => {
    const configService = mock<ConfigService>();
    jest
      .mocked(configService.get)
      .mockReturnValue('a-secret-at-least-32-chars-long-ok');
    userRepository = mock<IUserRepository>();
    strategy = new JwtStrategy(configService, userRepository);
  });

  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'user@example.com',
    roles: ['admin'],
  };

  it('returns the authenticated user shape when the user exists and is active', async () => {
    const now = new Date();
    const user = UserEntity.create({
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
      passwordHash: 'hashed',
      createdAt: now,
      updatedAt: now,
    });
    jest.mocked(userRepository.findById).mockResolvedValue(user);

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      roles: user.roles,
      permissions: user.permissions,
    });
  });

  it('throws UnauthorizedException when the user no longer exists', async () => {
    jest.mocked(userRepository.findById).mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UserInactiveException when the user has been deactivated', async () => {
    const now = new Date();
    const user = UserEntity.create({
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
      passwordHash: 'hashed',
      createdAt: now,
      updatedAt: now,
    });
    user.deactivate();
    jest.mocked(userRepository.findById).mockResolvedValue(user);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UserInactiveException,
    );
  });
});
