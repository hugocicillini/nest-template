import { Injectable, Logger } from '@nestjs/common';
import { IEmailSender } from '@application/_shared/email-sender.interface';

/**
 * Default IEmailSender adapter: logs instead of calling a real provider.
 * Fine for dev/test; swap for a real adapter (e.g. ResendEmailSender)
 * implementing the same interface for actual delivery.
 */
@Injectable()
export class LogEmailSender implements IEmailSender {
  private readonly logger = new Logger(LogEmailSender.name);

  send(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`Enviando e-mail para ${to} - "${subject}": ${body}`);
    return Promise.resolve();
  }
}
