import { AuditLogEntity } from '@domain/audit-log/audit-log.entity';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface IAuditLogRepository {
  create(log: AuditLogEntity): Promise<AuditLogEntity>;
  findAll(params: PaginationParams): Promise<PaginatedResult<AuditLogEntity>>;
}
