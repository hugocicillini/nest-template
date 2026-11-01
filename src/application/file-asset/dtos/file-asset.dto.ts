import { FileAssetEntity } from '@domain/file-asset/file-asset.entity';

export interface FileAssetDto {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy: string | null;
  createdAt: Date;
}

export function toFileAssetDto(fileAsset: FileAssetEntity): FileAssetDto {
  return {
    id: fileAsset.id,
    fileName: fileAsset.fileName,
    mimeType: fileAsset.mimeType,
    size: fileAsset.size,
    uploadedBy: fileAsset.uploadedBy,
    createdAt: fileAsset.createdAt,
  };
}
