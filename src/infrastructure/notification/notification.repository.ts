import { Injectable } from '@nestjs/common';
import { Notification as PrismaNotification } from '@generated/prisma';
import { NotificationEntity } from '@domain/notification/notification.entity';
import { INotificationRepository } from '@application/notification/notification-repository.interface';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';
import { PrismaService } from '../_shared/prisma.service';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(notification: NotificationEntity): Promise<NotificationEntity> {
    const record = await this.prisma.notification.create({
      data: {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      },
    });

    return this.toEntity(record);
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    const record = await this.prisma.notification.findUnique({
      where: { id },
    });

    return record ? this.toEntity(record) : null;
  }

  async findAllForUser(
    userId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<NotificationEntity>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: records.map((record) => this.toEntity(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async save(notification: NotificationEntity): Promise<NotificationEntity> {
    const record = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: notification.readAt },
    });

    return this.toEntity(record);
  }

  private toEntity(record: PrismaNotification): NotificationEntity {
    return NotificationEntity.reconstitute({
      id: record.id,
      userId: record.userId,
      type: record.type,
      title: record.title,
      message: record.message,
      readAt: record.readAt,
      createdAt: record.createdAt,
    });
  }
}
