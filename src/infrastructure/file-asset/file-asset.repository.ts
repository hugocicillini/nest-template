import { Injectable } from '@nestjs/common';
import { FileAsset as PrismaFileAsset } from '@generated/prisma';
import { FileAssetEntity } from '@domain/file-asset/file-asset.entity';
import { IFileAssetRepository } from '@application/file-asset/file-asset-repository.interface';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';
import { PrismaService } from '../_shared/prisma.service';

@Injectable()
export class FileAssetRepository implements IFileAssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(fileAsset: FileAssetEntity): Promise<FileAssetEntity> {
    const record = await this.prisma.fileAsset.create({
      data: {
        id: fileAsset.id,
        fileName: fileAsset.fileName,
        mimeType: fileAsset.mimeType,
        size: fileAsset.size,
        storageKey: fileAsset.storageKey,
        uploadedBy: fileAsset.uploadedBy,
      },
    });

    return this.toEntity(record);
  }

  async findById(id: string): Promise<FileAssetEntity | null> {
    const record = await this.prisma.fileAsset.findFirst({
      where: { id, deletedAt: null },
    });

    return record ? this.toEntity(record) : null;
  }

  async findAllForUser(
    userId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<FileAssetEntity>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const where = { uploadedBy: userId, deletedAt: null };

    const [records, total] = await Promise.all([
      this.prisma.fileAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fileAsset.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toEntity(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.fileAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private toEntity(record: PrismaFileAsset): FileAssetEntity {
    return FileAssetEntity.reconstitute({
      id: record.id,
      fileName: record.fileName,
      mimeType: record.mimeType,
      size: record.size,
      storageKey: record.storageKey,
      uploadedBy: record.uploadedBy,
      createdAt: record.createdAt,
      deletedAt: record.deletedAt,
    });
  }
}
