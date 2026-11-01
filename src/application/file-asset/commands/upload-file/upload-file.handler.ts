import { randomUUID } from 'crypto';
import { basename } from 'path';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { FileAssetEntity } from '@domain/file-asset/file-asset.entity';
import { InvalidFileTypeException } from '@domain/_shared/domain.exception';
import { FILE_ASSET_REPOSITORY } from '@application/file-asset/file-asset-repository.interface';
import type { IFileAssetRepository } from '@application/file-asset/file-asset-repository.interface';
import { FILE_STORAGE } from '@application/file-asset/file-storage.interface';
import type { IFileStorage } from '@application/file-asset/file-storage.interface';
import {
  FileAssetDto,
  toFileAssetDto,
} from '@application/file-asset/dtos/file-asset.dto';
import { NOTIFICATION_QUEUE } from '@application/_shared/notification-queue.interface';
import type { INotificationQueue } from '@application/_shared/notification-queue.interface';
import { UploadFileCommand } from './upload-file.command';

/**
 * Curated allowlist, not the client-supplied `command.mimeType` — that's
 * just the request's Content-Type header, trivially spoofable. The actual
 * bytes are sniffed via file-type's magic-number detection before anything
 * is written to storage. Extend this set as the template's real needs grow.
 */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

@CommandHandler(UploadFileCommand)
export class UploadFileHandler implements ICommandHandler<
  UploadFileCommand,
  FileAssetDto
> {
  constructor(
    @Inject(FILE_STORAGE) private readonly fileStorage: IFileStorage,
    @Inject(FILE_ASSET_REPOSITORY)
    private readonly fileAssetRepository: IFileAssetRepository,
    @Inject(NOTIFICATION_QUEUE)
    private readonly notificationQueue: INotificationQueue,
  ) {}

  async execute(command: UploadFileCommand): Promise<FileAssetDto> {
    // file-type is ESM-only (dynamic import, not a static one, since this
    // project compiles to CommonJS) — see the handler's own history for why
    // an older CJS-compatible version isn't used instead: file-type <=21.3.0
    // has a known infinite-loop DoS parsing malformed MKV/ASF input, which
    // would turn this exact validation into the vulnerability it's meant to
    // prevent.
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(command.buffer);

    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new InvalidFileTypeException(detected?.mime ?? null);
    }

    const id = randomUUID();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    // basename() strips any directory components a crafted fileName could
    // carry (e.g. "../../../../etc/cron.d/evil") before it ever reaches
    // the storage adapter.
    const storageKey = `${timestamp}-${basename(command.fileName)}`;

    await this.fileStorage.save(storageKey, command.buffer);

    const fileAsset = FileAssetEntity.create({
      id,
      fileName: command.fileName,
      mimeType: command.mimeType,
      size: command.size,
      storageKey,
      uploadedBy: command.uploadedBy,
      createdAt: new Date(),
    });

    const saved = await this.fileAssetRepository.create(fileAsset);

    if (command.uploadedBy) {
      await this.notificationQueue.enqueue({
        userId: command.uploadedBy,
        type: 'file.uploaded',
        title: 'Arquivo enviado',
        message: `${command.fileName} foi enviado com sucesso.`,
      });
    }

    return toFileAssetDto(saved);
  }
}
