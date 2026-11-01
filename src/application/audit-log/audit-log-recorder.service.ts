import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditLogEntity } from '@domain/audit-log/audit-log.entity';
import { AUDIT_LOG_REPOSITORY } from './audit-log-repository.interface';
import type { IAuditLogRepository } from './audit-log-repository.interface';

export interface RecordAuditLogInput {
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogRecorder {
  private readonly logger = new Logger(AuditLogRecorder.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    const log = AuditLogEntity.create({
      id: randomUUID(),
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? null,
      createdAt: new Date(),
    });

    await this.auditLogRepository.create(log);
  }

  /**
   * Fire-and-forget variant: the common case across write handlers, none
   * of which need to confirm the audit entry landed before responding to
   * the client - it's bookkeeping, not part of the operation's own
   * correctness. Errors are caught and logged here, never surfaced to the
   * caller, so a bookkeeping failure never fails the actual request.
   */
  recordAsync(input: RecordAuditLogInput): void {
    this.record(input).catch((error: unknown) => {
      this.logger.error(
        `Failed to record audit log for action "${input.action}": ${String(error)}`,
      );
    });
  }
}
