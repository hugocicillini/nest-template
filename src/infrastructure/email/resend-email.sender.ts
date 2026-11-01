import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { IEmailSender } from '@application/_shared/email-sender.interface';

/**
 * IEmailSender adapter backed by Resend - swap-in replacement for
 * LogEmailSender once RESEND_API_KEY/EMAIL_FROM are set. FROM must be a
 * Resend-verified sender address.
 */
@Injectable()
export class ResendEmailSender implements IEmailSender {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    const from = config.get<string>('EMAIL_FROM');

    if (!apiKey || !from) {
      throw new Error(
        'RESEND_API_KEY and EMAIL_FROM are required when ResendEmailSender is enabled',
      );
    }

    this.resend = new Resend(apiKey);
    this.from = from;
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      text: body,
    });

    if (error) {
      throw new Error(`Resend failed to send email: ${error.message}`);
    }
  }
}
