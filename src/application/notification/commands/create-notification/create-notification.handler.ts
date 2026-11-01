import { randomUUID } from 'crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotificationEntity } from '@domain/notification/notification.entity';
import { NOTIFICATION_REPOSITORY } from '@application/notification/notification-repository.interface';
import type { INotificationRepository } from '@application/notification/notification-repository.interface';
import { NOTIFICATION_PUBLISHER } from '@application/notification/notification-publisher.interface';
import type { INotificationPublisher } from '@application/notification/notification-publisher.interface';
import { CreateNotificationCommand } from './create-notification.command';

@CommandHandler(CreateNotificationCommand)
export class CreateNotificationHandler implements ICommandHandler<
  CreateNotificationCommand,
  { id: string }
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @Inject(NOTIFICATION_PUBLISHER)
    private readonly notificationPublisher: INotificationPublisher,
  ) {}

  async execute(command: CreateNotificationCommand): Promise<{ id: string }> {
    const notification = NotificationEntity.create({
      id: randomUUID(),
      userId: command.userId,
      type: command.type,
      title: command.title,
      message: command.message,
      createdAt: new Date(),
    });

    const saved = await this.notificationRepository.create(notification);
    // Best-effort - see INotificationPublisher's doc comment. The
    // notification is already durably saved above regardless of whether
    // anyone is connected to receive this.
    this.notificationPublisher.publish(saved);

    return { id: saved.id };
  }
}
