import { UserEntity } from '@domain/user/user.entity';
import {
  PaginatedResult,
  PaginationParams,
} from '@application/_shared/pagination';
import { TransactionContext } from '@application/_shared/transaction-runner.interface';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findAll(params: PaginationParams): Promise<PaginatedResult<UserEntity>>;
  save(user: UserEntity, tx?: TransactionContext): Promise<UserEntity>;
  emailExists(email: string, excludeUserId?: string): Promise<boolean>;
  softDelete(
    id: string,
    deletedBy?: string,
    tx?: TransactionContext,
  ): Promise<void>;
  assignRole(userId: string, roleId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
}
