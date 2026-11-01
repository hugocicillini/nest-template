import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { CreateNotificationHandler } from '@application/notification/commands/create-notification/create-notification.handler';
import { MarkNotificationAsReadHandler } from '@application/notification/commands/mark-notification-as-read/mark-notification-as-read.handler';
import { ListMyNotificationsHandler } from '@application/notification/queries/list-my-notifications/list-my-notifications.handler';
import { NOTIFICATION_REPOSITORY } from '@application/notification/notification-repository.interface';
import { NOTIFICATION_PUBLISHER } from '@application/notification/notification-publisher.interface';
import { NOTIFICATION_QUEUE } from '@application/_shared/notification-queue.interface';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import { NotificationRepository } from '@infrastructure/notification/notification.repository';
import { BullMqNotificationQueue } from '@infrastructure/notification/bullmq-notification.queue';
import { NotificationProcessor } from '@infrastructure/notification/notification.processor';
import { NOTIFICATION_QUEUE_NAME } from '@infrastructure/notification/notification-queue.constant';
import { UserRepository } from '@infrastructure/user/user.repository';
import { NotificationController } from './notification/controllers/notification.controller';
import { NotificationsGateway } from './notification/gateways/notification.gateway';

@Module({
  imports: [
    CqrsModule,
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: NOTIFICATION_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    // Separate registration from AuthModule's - AuthModule doesn't export
    // JwtModule, and the WS handshake needs its own JwtService to verify
    // the access token the client sends via `io(url, { auth: { token } })`.
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
    NotificationProcessor,
    NotificationsGateway,
    { provide: NOTIFICATION_REPOSITORY, useClass: NotificationRepository },
    { provide: NOTIFICATION_QUEUE, useClass: BullMqNotificationQueue },
    { provide: USER_REPOSITORY, useClass: UserRepository },
    // Same instance as the NotificationsGateway provider above, just also
    // reachable through the application-layer port - CreateNotificationHandler
    // depends on INotificationPublisher, never on the gateway class directly.
    { provide: NOTIFICATION_PUBLISHER, useExisting: NotificationsGateway },
  ],
  exports: [NOTIFICATION_QUEUE],
})
export class NotificationModule {}
