import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotificationNotFoundException } from '@domain/_shared/domain.exception';
import { NOTIFICATION_REPOSITORY } from '@application/notification/notification-repository.interface';
import type { INotificationRepository } from '@application/notification/notification-repository.interface';
import { MarkNotificationAsReadCommand } from './mark-notification-as-read.command';

@CommandHandler(MarkNotificationAsReadCommand)
export class MarkNotificationAsReadHandler implements ICommandHandler<
  MarkNotificationAsReadCommand,
  void
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(command: MarkNotificationAsReadCommand): Promise<void> {
    const notification = await this.notificationRepository.findById(
      command.notificationId,
    );

    if (!notification || notification.userId !== command.userId) {
      throw new NotificationNotFoundException(command.notificationId);
    }

    notification.markAsRead();
    await this.notificationRepository.save(notification);
  }
}
