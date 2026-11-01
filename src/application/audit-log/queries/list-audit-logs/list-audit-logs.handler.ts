import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AuditLogEntity } from '@domain/audit-log/audit-log.entity';
import { PaginatedResult } from '@application/_shared/pagination';
import { AUDIT_LOG_REPOSITORY } from '@application/audit-log/audit-log-repository.interface';
import type { IAuditLogRepository } from '@application/audit-log/audit-log-repository.interface';
import { ListAuditLogsQuery } from './list-audit-logs.query';

@QueryHandler(ListAuditLogsQuery)
export class ListAuditLogsHandler implements IQueryHandler<
  ListAuditLogsQuery,
  PaginatedResult<AuditLogEntity>
> {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  execute(query: ListAuditLogsQuery): Promise<PaginatedResult<AuditLogEntity>> {
    return this.auditLogRepository.findAll({
      page: query.page,
      limit: query.limit,
    });
  }
}
