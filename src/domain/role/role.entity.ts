import { BaseEntity, BaseEntityProps } from '../_shared/base.entity';

export interface RoleEntityProps extends BaseEntityProps {
  name: string;
  description: string | null;
  permissions: string[];
}

export interface CreateRoleProps {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class RoleEntity extends BaseEntity {
  name: string;
  description: string | null;
  permissions: string[];

  private constructor(props: RoleEntityProps) {
    super(props);
    this.name = props.name;
    this.description = props.description;
    this.permissions = props.permissions;
  }

  static create(props: CreateRoleProps): RoleEntity {
    return new RoleEntity({
      id: props.id,
      name: props.name,
      description: props.description ?? null,
      permissions: [],
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
    });
  }

  static reconstitute(props: RoleEntityProps): RoleEntity {
    return new RoleEntity(props);
  }

  hasPermission(permissionName: string): boolean {
    return this.permissions.includes(permissionName);
  }
}
