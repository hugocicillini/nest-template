import { mock } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { UserEntity } from '@domain/user/user.entity';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { NotificationEntity } from '@domain/notification/notification.entity';
import { NotificationsGateway } from './notification.gateway';

function fakeSocket(token: string | undefined) {
  const join = jest.fn().mockResolvedValue(undefined);
  const disconnect = jest.fn();
  const socket = {
    handshake: { auth: { token } },
    join,
    disconnect,
  } as unknown as Socket;
  return { socket, join, disconnect };
}

describe('NotificationsGateway', () => {
  let jwtService: JwtService;
  let userRepository: IUserRepository;
  let gateway: NotificationsGateway;

  beforeEach(() => {
    jwtService = mock<JwtService>();
    userRepository = mock<IUserRepository>();
    gateway = new NotificationsGateway(jwtService, userRepository);
  });

  describe('handleConnection', () => {
    it('disconnects when the handshake has no token', async () => {
      const { socket, disconnect } = fakeSocket(undefined);

      await gateway.handleConnection(socket);

      expect(disconnect).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('disconnects when the token fails verification', async () => {
      const { socket, disconnect } = fakeSocket('bad-token');
      jest
        .mocked(jwtService.verifyAsync)
        .mockRejectedValue(new Error('invalid signature'));

      await gateway.handleConnection(socket);

      expect(disconnect).toHaveBeenCalled();
    });

    it('disconnects when the token is valid but the user no longer exists', async () => {
      const { socket, disconnect, join } = fakeSocket('good-token');
      jest.mocked(jwtService.verifyAsync).mockResolvedValue({ sub: 'user-1' });
      jest.mocked(userRepository.findById).mockResolvedValue(null);

      await gateway.handleConnection(socket);

      expect(disconnect).toHaveBeenCalled();
      expect(join).not.toHaveBeenCalled();
    });

    it('joins the user-scoped room when the token and user are valid', async () => {
      const { socket, disconnect, join } = fakeSocket('good-token');
      const now = new Date();
      const user = UserEntity.create({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        createdAt: now,
        updatedAt: now,
      });
      jest.mocked(jwtService.verifyAsync).mockResolvedValue({ sub: 'user-1' });
      jest.mocked(userRepository.findById).mockResolvedValue(user);

      await gateway.handleConnection(socket);

      expect(join).toHaveBeenCalledWith('user:user-1');
      expect(disconnect).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('emits to the room scoped to the notification owner, not a broadcast', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      gateway.server = { to } as never;

      const notification = NotificationEntity.create({
        id: 'notif-1',
        userId: 'user-1',
        type: 'info',
        title: 'Title',
        message: 'Message',
        createdAt: new Date(),
      });

      gateway.publish(notification);

      expect(to).toHaveBeenCalledWith('user:user-1');
      expect(emit).toHaveBeenCalledWith('notification', notification);
    });
  });
});
