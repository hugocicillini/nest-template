import { RoleEntity } from '@domain/role/role.entity';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface IRoleRepository {
  findByName(name: string): Promise<RoleEntity | null>;
  findById(id: string): Promise<RoleEntity | null>;
  findAll(params: PaginationParams): Promise<PaginatedResult<RoleEntity>>;
  save(role: RoleEntity): Promise<RoleEntity>;
  nameExists(name: string): Promise<boolean>;
  assignPermission(roleId: string, permissionId: string): Promise<void>;
  removePermission(roleId: string, permissionId: string): Promise<void>;
  softDelete(id: string): Promise<void>;
}
