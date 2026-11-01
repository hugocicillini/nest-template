export const NOTIFICATION_QUEUE = Symbol('NOTIFICATION_QUEUE');

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
}

export interface INotificationQueue {
  enqueue(data: NotificationJobData): Promise<void>;
}
