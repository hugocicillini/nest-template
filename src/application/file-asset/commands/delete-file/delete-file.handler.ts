import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { FileAssetNotFoundException } from '@domain/_shared/domain.exception';
import { FILE_ASSET_REPOSITORY } from '@application/file-asset/file-asset-repository.interface';
import type { IFileAssetRepository } from '@application/file-asset/file-asset-repository.interface';
import { FILE_STORAGE } from '@application/file-asset/file-storage.interface';
import type { IFileStorage } from '@application/file-asset/file-storage.interface';
import { AuditLogRecorder } from '@application/audit-log/audit-log-recorder.service';
import { DeleteFileCommand } from './delete-file.command';

@CommandHandler(DeleteFileCommand)
export class DeleteFileHandler implements ICommandHandler<
  DeleteFileCommand,
  void
> {
  private readonly logger = new Logger(DeleteFileHandler.name);

  constructor(
    @Inject(FILE_ASSET_REPOSITORY)
    private readonly fileAssetRepository: IFileAssetRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: IFileStorage,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async execute(command: DeleteFileCommand): Promise<void> {
    const fileAsset = await this.fileAssetRepository.findById(
      command.fileAssetId,
    );
    // Same exception for "doesn't exist" and "exists but isn't yours" -
    // deliberately not leaking existence of another user's file.
    if (!fileAsset || fileAsset.uploadedBy !== command.actorId) {
      throw new FileAssetNotFoundException(command.fileAssetId);
    }

    await this.fileAssetRepository.softDelete(fileAsset.id);

    // The DB row is already soft-deleted at this point, so the delete has
    // already succeeded from the caller's perspective - a failure to
    // reclaim the underlying bytes is logged, not thrown, since retrying
    // the whole command isn't meaningful once the row is gone.
    try {
      await this.fileStorage.delete(fileAsset.storageKey);
    } catch (error) {
      this.logger.error(
        `Failed to delete storage key "${fileAsset.storageKey}" for file asset ${fileAsset.id}: ${String(error)}`,
      );
    }

    this.auditLogRecorder.recordAsync({
      actorId: command.actorId,
      action: 'file_asset.deleted',
      resourceType: 'FileAsset',
      resourceId: fileAsset.id,
    });
  }
}
