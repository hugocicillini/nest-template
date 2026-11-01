import type { Readable } from 'stream';
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FileAssetNotFoundException } from '@domain/_shared/domain.exception';
import { FILE_ASSET_REPOSITORY } from '@application/file-asset/file-asset-repository.interface';
import type { IFileAssetRepository } from '@application/file-asset/file-asset-repository.interface';
import { FILE_STORAGE } from '@application/file-asset/file-storage.interface';
import type { IFileStorage } from '@application/file-asset/file-storage.interface';
import { DownloadFileQuery } from './download-file.query';

export interface DownloadedFile {
  fileName: string;
  mimeType: string;
  size: number;
  stream: Readable;
}

@QueryHandler(DownloadFileQuery)
export class DownloadFileHandler implements IQueryHandler<
  DownloadFileQuery,
  DownloadedFile
> {
  constructor(
    @Inject(FILE_ASSET_REPOSITORY)
    private readonly fileAssetRepository: IFileAssetRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: IFileStorage,
  ) {}

  async execute(query: DownloadFileQuery): Promise<DownloadedFile> {
    const fileAsset = await this.fileAssetRepository.findById(
      query.fileAssetId,
    );
    // Same exception for "doesn't exist" and "exists but isn't yours" -
    // deliberately not leaking existence of another user's file (matches
    // MarkNotificationAsReadHandler's ownership check elsewhere).
    if (
      !fileAsset ||
      fileAsset.deletedAt ||
      fileAsset.uploadedBy !== query.userId
    ) {
      throw new FileAssetNotFoundException(query.fileAssetId);
    }

    const stream = await this.fileStorage.createReadStream(
      fileAsset.storageKey,
    );

    return {
      fileName: fileAsset.fileName,
      mimeType: fileAsset.mimeType,
      size: fileAsset.size,
      stream,
    };
  }
}
