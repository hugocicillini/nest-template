export interface FileAssetProps {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  uploadedBy: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface CreateFileAssetProps {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  uploadedBy: string | null;
  createdAt: Date;
}

export class FileAssetEntity {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly storageKey: string;
  readonly uploadedBy: string | null;
  readonly createdAt: Date;
  deletedAt: Date | null;

  private constructor(props: FileAssetProps) {
    this.id = props.id;
    this.fileName = props.fileName;
    this.mimeType = props.mimeType;
    this.size = props.size;
    this.storageKey = props.storageKey;
    this.uploadedBy = props.uploadedBy;
    this.createdAt = props.createdAt;
    this.deletedAt = props.deletedAt;
  }

  static create(props: CreateFileAssetProps): FileAssetEntity {
    return new FileAssetEntity({ ...props, deletedAt: null });
  }

  static reconstitute(props: FileAssetProps): FileAssetEntity {
    return new FileAssetEntity(props);
  }

  markAsDeleted(): void {
    this.deletedAt = new Date();
  }
}
