import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { EMAIL_QUEUE } from '@application/_shared/email-queue.interface';
import { EMAIL_SENDER } from '@application/_shared/email-sender.interface';
import { BullMqEmailQueue } from '@infrastructure/email/bullmq-email.queue';
import { EmailProcessor } from '@infrastructure/email/email.processor';
import { EMAIL_QUEUE_NAME } from '@infrastructure/email/email-queue.constant';
import { LogEmailSender } from '@infrastructure/email/log-email.sender';

@Module({
  imports: [
    BullModule.registerQueue({ name: EMAIL_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: EMAIL_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    EmailProcessor,
    { provide: EMAIL_QUEUE, useClass: BullMqEmailQueue },
    { provide: EMAIL_SENDER, useClass: LogEmailSender },
  ],
  exports: [EMAIL_QUEUE],
})
export class EmailModule {}
