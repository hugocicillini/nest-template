import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotificationEntity } from '@domain/notification/notification.entity';
import { PaginatedResult } from '@application/_shared/pagination';
import { NOTIFICATION_REPOSITORY } from '@application/notification/notification-repository.interface';
import type { INotificationRepository } from '@application/notification/notification-repository.interface';
import { ListMyNotificationsQuery } from './list-my-notifications.query';

@QueryHandler(ListMyNotificationsQuery)
export class ListMyNotificationsHandler implements IQueryHandler<
  ListMyNotificationsQuery,
  PaginatedResult<NotificationEntity>
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  execute(
    query: ListMyNotificationsQuery,
  ): Promise<PaginatedResult<NotificationEntity>> {
    return this.notificationRepository.findAllForUser(query.userId, {
      page: query.page,
      limit: query.limit,
    });
  }
}
