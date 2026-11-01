import { NotificationEntity } from '@domain/notification/notification.entity';

export const NOTIFICATION_PUBLISHER = Symbol('NOTIFICATION_PUBLISHER');

/**
 * Push-only complement to the notification repository - a client that never
 * connects (or disconnects mid-session) still sees every notification
 * through GET /notifications/me, which stays the source of truth. This is
 * best-effort delivery to whoever happens to be connected right now.
 */
export interface INotificationPublisher {
  publish(notification: NotificationEntity): void;
}
