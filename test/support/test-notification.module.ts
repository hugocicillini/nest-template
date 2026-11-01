import { NOTIFICATION_QUEUE } from '@application/_shared/notification-queue.interface';
import { CreateNotificationHandler } from '@application/notification/commands/create-notification/create-notification.handler';
import { MarkNotificationAsReadHandler } from '@application/notification/commands/mark-notification-as-read/mark-notification-as-read.handler';
import { NOTIFICATION_REPOSITORY } from '@application/notification/notification-repository.interface';
import { NOTIFICATION_PUBLISHER } from '@application/notification/notification-publisher.interface';
import { ListMyNotificationsHandler } from '@application/notification/queries/list-my-notifications/list-my-notifications.handler';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import { NotificationRepository } from '@infrastructure/notification/notification.repository';
import { UserRepository } from '@infrastructure/user/user.repository';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { NotificationController } from '@presentation/notification/controllers/notification.controller';
import { NotificationsGateway } from '@presentation/notification/gateways/notification.gateway';
import { FakeNotificationQueue } from './fake-notification-queue';

/**
 * Replaces NotificationModule in tests - same real controller/handlers/
 * repository/gateway as production (Prisma still does real work against the
 * test DB), just without BullModule.registerQueue/BullBoardModule.forFeature/
 * NotificationProcessor, so no Redis client gets constructed. The gateway's
 * Socket.io server never binds a port either - Nest only wires that up on
 * app.listen() (see main.ts's createIOServer() comment), which the e2e
 * harness never calls.
 */
@Module({
  imports: [
    CqrsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [NotificationController],
  providers: [
    CreateNotificationHandler,
    MarkNotificationAsReadHandler,
    ListMyNotificationsHandler,
    NotificationsGateway,
    { provide: NOTIFICATION_REPOSITORY, useClass: NotificationRepository },
    { provide: NOTIFICATION_QUEUE, useClass: FakeNotificationQueue },
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: NOTIFICATION_PUBLISHER, useExisting: NotificationsGateway },
  ],
  exports: [NOTIFICATION_QUEUE],
})
export class TestNotificationModule {}
