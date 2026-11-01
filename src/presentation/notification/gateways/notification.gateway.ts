import { Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { NotificationEntity } from '@domain/notification/notification.entity';
import { INotificationPublisher } from '@application/notification/notification-publisher.interface';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';

function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Handles the live WebSocket side only - REST (notification.controller.ts)
 * remains the only way to list/mark-as-read, and the only guaranteed
 * delivery path. This gateway just pushes faster when it can.
 */
@WebSocketGateway({ namespace: '/notifications' })
export class NotificationsGateway
  implements OnGatewayConnection, INotificationPublisher
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  // The WS handshake has no Authorization header the way a normal HTTP
  // request does - the client sends the access token via
  // `io(url, { auth: { token } })` instead, verified here by hand rather
  // than through AuthGuard('jwt') (which is HTTP-specific).
  async handleConnection(socket: Socket): Promise<void> {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      socket.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
        { algorithms: ['HS256'] },
      );
      const user = await this.userRepository.findById(payload.sub);

      if (!user) {
        socket.disconnect();
        return;
      }

      user.verifyActive();
      await socket.join(userRoom(user.id));
    } catch (error) {
      this.logger.debug(`WS handshake rejected: ${(error as Error).message}`);
      socket.disconnect();
    }
  }

  publish(notification: NotificationEntity): void {
    this.server
      .to(userRoom(notification.userId))
      .emit('notification', notification);
  }
}
