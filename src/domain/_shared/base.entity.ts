export interface BaseEntityProps {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export abstract class BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;

  protected constructor(props: BaseEntityProps) {
    this.id = props.id;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt ?? null;
    this.createdBy = props.createdBy ?? null;
    this.updatedBy = props.updatedBy ?? null;
  }

  get isActive(): boolean {
    return this.deletedAt === null;
  }

  markAsDeleted(deletedBy?: string): void {
    this.deletedAt = new Date();
    this.updatedAt = this.deletedAt;
    this.updatedBy = deletedBy ?? null;
  }

  registerUpdate(updatedBy?: string): void {
    this.updatedAt = new Date();
    this.updatedBy = updatedBy ?? null;
  }
}
