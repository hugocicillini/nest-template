import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UploadFileHandler } from '@application/file-asset/commands/upload-file/upload-file.handler';
import { DeleteFileHandler } from '@application/file-asset/commands/delete-file/delete-file.handler';
import { ListFileAssetsHandler } from '@application/file-asset/queries/list-file-assets/list-file-assets.handler';
import { DownloadFileHandler } from '@application/file-asset/queries/download-file/download-file.handler';
import { FILE_ASSET_REPOSITORY } from '@application/file-asset/file-asset-repository.interface';
import { FILE_STORAGE } from '@application/file-asset/file-storage.interface';
import { FileAssetRepository } from '@infrastructure/file-asset/file-asset.repository';
import { LocalFileStorage } from '@infrastructure/file-asset/local-file-storage';
import { FileAssetController } from './file-asset/controllers/file-asset.controller';
import { AuditLogModule } from './audit-log.module';
import { NotificationModule } from './notification.module';

@Module({
  imports: [CqrsModule, AuditLogModule, NotificationModule],
  controllers: [FileAssetController],
  providers: [
    UploadFileHandler,
    DeleteFileHandler,
    ListFileAssetsHandler,
    DownloadFileHandler,
    { provide: FILE_ASSET_REPOSITORY, useClass: FileAssetRepository },
    { provide: FILE_STORAGE, useClass: LocalFileStorage },
  ],
})
export class FileAssetModule {}
