export const EMAIL_QUEUE = Symbol('EMAIL_QUEUE');

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

export interface IEmailQueue {
  enqueue(data: EmailJobData): Promise<void>;
}
