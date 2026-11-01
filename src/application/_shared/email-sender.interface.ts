export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface IEmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}
