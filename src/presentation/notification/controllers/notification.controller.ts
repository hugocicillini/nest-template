import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { NotificationEntity } from '@domain/notification/notification.entity';
import { PaginatedResult } from '@application/_shared/pagination';
import { ListMyNotificationsQuery } from '@application/notification/queries/list-my-notifications/list-my-notifications.query';
import { MarkNotificationAsReadCommand } from '@application/notification/commands/mark-notification-as-read/mark-notification-as-read.command';
import { PaginationQueryDto } from '../../_shared/dtos/pagination-query.schema';
import { CurrentUser } from '../../_shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../_shared/decorators/current-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('me')
  listMine(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<NotificationEntity>> {
    return this.queryBus.execute(
      new ListMyNotificationsQuery(currentUser.id, query.page, query.limit),
    );
  }

  @Patch(':notificationId/read')
  markAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new MarkNotificationAsReadCommand(notificationId, currentUser.id),
    );
  }
}
