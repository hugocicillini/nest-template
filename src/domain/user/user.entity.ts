import { BaseEntity, BaseEntityProps } from '../_shared/base.entity';
import { UserInactiveException } from '../_shared/domain.exception';

export interface UserEntityProps extends BaseEntityProps {
  name: string;
  email: string;
  passwordHash: string;
  active: boolean;
  emailVerifiedAt: Date | null;
  roles: string[];
  permissions: string[];
}

export interface CreateUserProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export class UserEntity extends BaseEntity {
  name: string;
  email: string;
  passwordHash: string;
  active: boolean;
  emailVerifiedAt: Date | null;
  roles: string[];
  permissions: string[];

  private constructor(props: UserEntityProps) {
    super(props);
    this.name = props.name;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.active = props.active;
    this.emailVerifiedAt = props.emailVerifiedAt;
    this.roles = props.roles;
    this.permissions = props.permissions;
  }

  static create(props: CreateUserProps): UserEntity {
    return new UserEntity({
      id: props.id,
      name: props.name,
      email: props.email,
      passwordHash: props.passwordHash,
      active: true,
      emailVerifiedAt: null,
      roles: [],
      permissions: [],
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      createdBy: props.createdBy ?? null,
      updatedBy: null,
      deletedAt: null,
    });
  }

  static reconstitute(props: UserEntityProps): UserEntity {
    return new UserEntity(props);
  }

  hasRole(roleName: string): boolean {
    return this.roles.includes(roleName);
  }

  // Flattened across every role the user has - a role's own permission
  // set is the unit of assignment (see RoleEntity.hasPermission()), a
  // user's is just the union of all their roles'.
  hasPermission(permissionName: string): boolean {
    return this.permissions.includes(permissionName);
  }

  verifyActive(): void {
    if (!this.active || !this.isActive) {
      throw new UserInactiveException();
    }
  }

  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }

  verifyEmail(): void {
    this.emailVerifiedAt = new Date();
  }
}
