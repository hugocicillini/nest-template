import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EmailJobData,
  IEmailQueue,
} from '@application/_shared/email-queue.interface';
import { EMAIL_QUEUE_NAME } from './email-queue.constant';

@Injectable()
export class BullMqEmailQueue implements IEmailQueue {
  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly queue: Queue<EmailJobData>,
  ) {}

  async enqueue(data: EmailJobData): Promise<void> {
    await this.queue.add('send-email', data);
  }
}
