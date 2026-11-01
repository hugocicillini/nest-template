import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QueryBus } from '@nestjs/cqrs';
import { AuditLogEntity } from '@domain/audit-log/audit-log.entity';
import { PaginatedResult } from '@application/_shared/pagination';
import { ListAuditLogsQuery } from '@application/audit-log/queries/list-audit-logs/list-audit-logs.query';
import { PaginationQueryDto } from '../../_shared/dtos/pagination-query.schema';
import { Roles } from '../../_shared/decorators/roles.decorator';
import { RolesGuard } from '../../_shared/guards/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<AuditLogEntity>> {
    return this.queryBus.execute(
      new ListAuditLogsQuery(query.page, query.limit),
    );
  }
}
