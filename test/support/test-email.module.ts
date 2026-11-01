import { EMAIL_QUEUE } from '@application/_shared/email-queue.interface';
import { Module } from '@nestjs/common';
import { FakeEmailQueue } from './fake-email-queue';

/** Replaces EmailModule in tests - no BullMQ queue/worker registered. */
@Module({
  providers: [{ provide: EMAIL_QUEUE, useClass: FakeEmailQueue }],
  exports: [EMAIL_QUEUE],
})
export class TestEmailModule {}
