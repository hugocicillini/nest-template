import {
  NotificationJobData,
  INotificationQueue,
} from '@application/_shared/notification-queue.interface';

export class FakeNotificationQueue implements INotificationQueue {
  readonly enqueued: NotificationJobData[] = [];

  enqueue(data: NotificationJobData): Promise<void> {
    this.enqueued.push(data);
    return Promise.resolve();
  }
}
