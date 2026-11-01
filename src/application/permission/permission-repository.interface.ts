import { PermissionEntity } from '@domain/permission/permission.entity';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';

export const PERMISSION_REPOSITORY = Symbol('PERMISSION_REPOSITORY');

export interface IPermissionRepository {
  findByName(name: string): Promise<PermissionEntity | null>;
  findById(id: string): Promise<PermissionEntity | null>;
  findAll(params: PaginationParams): Promise<PaginatedResult<PermissionEntity>>;
  save(permission: PermissionEntity): Promise<PermissionEntity>;
  nameExists(name: string): Promise<boolean>;
  softDelete(id: string): Promise<void>;
}
