import { FileAssetEntity } from '@domain/file-asset/file-asset.entity';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';

export const FILE_ASSET_REPOSITORY = Symbol('FILE_ASSET_REPOSITORY');

export interface IFileAssetRepository {
  create(fileAsset: FileAssetEntity): Promise<FileAssetEntity>;
  findById(id: string): Promise<FileAssetEntity | null>;
  findAllForUser(
    userId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<FileAssetEntity>>;
  softDelete(id: string): Promise<void>;
}
