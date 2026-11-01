import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  INotificationQueue,
  NotificationJobData,
} from '@application/_shared/notification-queue.interface';
import { NOTIFICATION_QUEUE_NAME } from './notification-queue.constant';

@Injectable()
export class BullMqNotificationQueue implements INotificationQueue {
  constructor(
    @InjectQueue(NOTIFICATION_QUEUE_NAME)
    private readonly queue: Queue<NotificationJobData>,
  ) {}

  async enqueue(data: NotificationJobData): Promise<void> {
    await this.queue.add('create-notification', data);
  }
}
