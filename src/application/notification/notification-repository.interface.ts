import { NotificationEntity } from '@domain/notification/notification.entity';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface INotificationRepository {
  create(notification: NotificationEntity): Promise<NotificationEntity>;
  findById(id: string): Promise<NotificationEntity | null>;
  findAllForUser(
    userId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<NotificationEntity>>;
  save(notification: NotificationEntity): Promise<NotificationEntity>;
}
