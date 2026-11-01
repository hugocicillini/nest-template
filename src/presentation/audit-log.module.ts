import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ListAuditLogsHandler } from '@application/audit-log/queries/list-audit-logs/list-audit-logs.handler';
import { AuditLogRecorder } from '@application/audit-log/audit-log-recorder.service';
import { AUDIT_LOG_REPOSITORY } from '@application/audit-log/audit-log-repository.interface';
import { AuditLogRepository } from '@infrastructure/audit-log/audit-log.repository';
import { AuditLogController } from './audit-log/controllers/audit-log.controller';

@Module({
  imports: [CqrsModule],
  controllers: [AuditLogController],
  providers: [
    ListAuditLogsHandler,
    AuditLogRecorder,
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogRepository },
  ],
  exports: [AuditLogRecorder],
})
export class AuditLogModule {}
