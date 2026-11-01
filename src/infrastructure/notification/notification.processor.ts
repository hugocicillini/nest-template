import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CommandBus } from '@nestjs/cqrs';
import * as Sentry from '@sentry/nestjs';
import { NotificationJobData } from '@application/_shared/notification-queue.interface';
import { CreateNotificationCommand } from '@application/notification/commands/create-notification/create-notification.command';
import { createQueueJobPolicy } from '@infrastructure/_shared/queue-resilience.policy';
import { NOTIFICATION_QUEUE_NAME } from './notification-queue.constant';

@Processor(NOTIFICATION_QUEUE_NAME)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly policy = createQueueJobPolicy();

  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, type, title, message } = job.data;

    await this.policy.execute(() =>
      this.commandBus.execute(
        new CreateNotificationCommand(userId, type, title, message),
      ),
    );
  }

  // Fires on every failed attempt, including ones BullMQ will still retry -
  // only escalate to a real Sentry issue once retries are exhausted, so a
  // transient blip that later succeeds doesn't page anyone.
  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationJobData> | undefined, error: Error): void {
    if (!job) return;

    const attempts = job.opts.attempts ?? 1;
    this.logger.error(
      `Notification job ${job.id} failed (attempt ${job.attemptsMade}/${attempts}): ${error.message}`,
    );

    if (job.attemptsMade >= attempts) {
      Sentry.captureException(error, {
        extra: {
          jobId: job.id,
          queue: NOTIFICATION_QUEUE_NAME,
          userId: job.data.userId,
        },
      });
    }
  }
}
