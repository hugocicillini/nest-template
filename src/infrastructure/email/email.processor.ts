import { EmailJobData } from '@application/_shared/email-queue.interface';
import { EMAIL_SENDER } from '@application/_shared/email-sender.interface';
import type { IEmailSender } from '@application/_shared/email-sender.interface';
import { createQueueJobPolicy } from '@infrastructure/_shared/queue-resilience.policy';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Job } from 'bullmq';
import { EMAIL_QUEUE_NAME } from './email-queue.constant';

@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly policy = createQueueJobPolicy();

  constructor(
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, body } = job.data;
    await this.policy.execute(() => this.emailSender.send(to, subject, body));
  }

  // Fires on every failed attempt, including ones BullMQ will still retry -
  // only escalate to a real Sentry issue once retries are exhausted, so a
  // transient blip that later succeeds doesn't page anyone.
  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailJobData> | undefined, error: Error): void {
    if (!job) return;

    const attempts = job.opts.attempts ?? 1;
    this.logger.error(
      `Email job ${job.id} failed (attempt ${job.attemptsMade}/${attempts}): ${error.message}`,
    );

    if (job.attemptsMade >= attempts) {
      Sentry.captureException(error, {
        extra: { jobId: job.id, queue: EMAIL_QUEUE_NAME, to: job.data.to },
      });
    }
  }
}
