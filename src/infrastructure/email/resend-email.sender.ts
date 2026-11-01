import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { IEmailSender } from '@application/_shared/email-sender.interface';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM as string;

/**
 * IEmailSender adapter backed by Resend - swap-in replacement for
 * LogEmailSender once RESEND_API_KEY/EMAIL_FROM are set. FROM must be a
 * Resend-verified sender address.
 */
@Injectable()
export class ResendEmailSender implements IEmailSender {
  async send(to: string, subject: string, body: string): Promise<void> {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      text: body,
    });

    if (error) {
      throw new Error(`Resend failed to send email: ${error.message}`);
    }
  }
}
