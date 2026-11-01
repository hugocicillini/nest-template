import {
  EmailJobData,
  IEmailQueue,
} from '@application/_shared/email-queue.interface';

/**
 * Captures enqueued jobs instead of sending them anywhere - this is also how
 * tests recover the raw reset/verification tokens that would otherwise only
 * ever exist inside a real email.
 */
export class FakeEmailQueue implements IEmailQueue {
  readonly sentEmails: EmailJobData[] = [];

  enqueue(data: EmailJobData): Promise<void> {
    this.sentEmails.push(data);
    return Promise.resolve();
  }
}
