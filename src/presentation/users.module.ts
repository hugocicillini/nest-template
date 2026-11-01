import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ListUsersHandler } from '@application/user/queries/list-users/list-users.handler';
import { GetUserHandler } from '@application/user/queries/get-user/get-user.handler';
import { UpdateUserHandler } from '@application/user/commands/update-user/update-user.handler';
import { ChangePasswordHandler } from '@application/user/commands/change-password/change-password.handler';
import { DeleteUserHandler } from '@application/user/commands/delete-user/delete-user.handler';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import { PASSWORD_HASHER } from '@application/user/password-hasher.interface';
import { PASSWORD_BREACH_CHECKER } from '@application/_shared/password-breach-checker.interface';
import { REFRESH_TOKEN_REPOSITORY } from '@application/refresh-token/refresh-token-repository.interface';
import { TRANSACTION_RUNNER } from '@application/_shared/transaction-runner.interface';
import { UserRepository } from '@infrastructure/user/user.repository';
import { BcryptPasswordHasher } from '@infrastructure/user/bcrypt-password-hasher';
import { NoopPasswordBreachChecker } from '@infrastructure/_shared/noop-password-breach-checker';
import { RefreshTokenRepository } from '@infrastructure/refresh-token/refresh-token.repository';
import { PrismaTransactionRunner } from '@infrastructure/_shared/prisma-transaction-runner';
import { UsersController } from './user/controllers/users.controller';
import { AuditLogModule } from './audit-log.module';

@Module({
  imports: [CqrsModule, AuditLogModule],
  controllers: [UsersController],
  providers: [
    ListUsersHandler,
    GetUserHandler,
    UpdateUserHandler,
    ChangePasswordHandler,
    DeleteUserHandler,
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    {
      provide: PASSWORD_BREACH_CHECKER,
      useClass: NoopPasswordBreachChecker,
    },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    { provide: TRANSACTION_RUNNER, useClass: PrismaTransactionRunner },
  ],
})
export class UsersModule {}
