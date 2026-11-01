import { BaseEntity, BaseEntityProps } from '../_shared/base.entity';

export interface PermissionEntityProps extends BaseEntityProps {
  name: string;
  description: string | null;
}

export interface CreatePermissionProps {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PermissionEntity extends BaseEntity {
  name: string;
  description: string | null;

  private constructor(props: PermissionEntityProps) {
    super(props);
    this.name = props.name;
    this.description = props.description;
  }

  static create(props: CreatePermissionProps): PermissionEntity {
    return new PermissionEntity({
      id: props.id,
      name: props.name,
      description: props.description ?? null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
    });
  }

  static reconstitute(props: PermissionEntityProps): PermissionEntity {
    return new PermissionEntity(props);
  }
}
