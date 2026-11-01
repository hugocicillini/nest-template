import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RegisterUserHandler } from '@application/user/commands/register-user/register-user.handler';
import { LoginHandler } from '@application/user/commands/login/login.handler';
import { VerifyEmailHandler } from '@application/user/commands/verify-email/verify-email.handler';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import { PASSWORD_HASHER } from '@application/user/password-hasher.interface';
import { TOKEN_SERVICE } from '@application/user/token-service.interface';
import { RefreshAccessTokenHandler } from '@application/refresh-token/commands/refresh-access-token/refresh-access-token.handler';
import { LogoutHandler } from '@application/refresh-token/commands/logout/logout.handler';
import { RevokeSessionHandler } from '@application/refresh-token/commands/revoke-session/revoke-session.handler';
import { ListSessionsHandler } from '@application/refresh-token/queries/list-sessions/list-sessions.handler';
import { IssueRefreshTokenService } from '@application/refresh-token/issue-refresh-token.service';
import { REFRESH_TOKEN_REPOSITORY } from '@application/refresh-token/refresh-token-repository.interface';
import { TOKEN_HASHER } from '@application/_shared/token-hasher.interface';
import { PASSWORD_BREACH_CHECKER } from '@application/_shared/password-breach-checker.interface';
import { RequestPasswordResetHandler } from '@application/password-reset/commands/request-password-reset/request-password-reset.handler';
import { ResetPasswordHandler } from '@application/password-reset/commands/reset-password/reset-password.handler';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '@application/password-reset/password-reset-token-repository.interface';
import { EMAIL_VERIFICATION_TOKEN_REPOSITORY } from '@application/email-verification/email-verification-token-repository.interface';
import { TRANSACTION_RUNNER } from '@application/_shared/transaction-runner.interface';
import { UserRepository } from '@infrastructure/user/user.repository';
import { BcryptPasswordHasher } from '@infrastructure/user/bcrypt-password-hasher';
import { JwtTokenService } from '@infrastructure/user/jwt-token.service';
import { JwtStrategy } from '@infrastructure/user/jwt.strategy';
import { RefreshTokenRepository } from '@infrastructure/refresh-token/refresh-token.repository';
import { RefreshTokenCleanupService } from '@infrastructure/refresh-token/refresh-token-cleanup.service';
import { PasswordResetTokenRepository } from '@infrastructure/password-reset/password-reset-token.repository';
import { PasswordResetTokenCleanupService } from '@infrastructure/password-reset/password-reset-token-cleanup.service';
import { EmailVerificationTokenRepository } from '@infrastructure/email-verification/email-verification-token.repository';
import { EmailVerificationTokenCleanupService } from '@infrastructure/email-verification/email-verification-token-cleanup.service';
import { PrismaTransactionRunner } from '@infrastructure/_shared/prisma-transaction-runner';
import { Sha256TokenHasher } from '@infrastructure/_shared/sha256-token-hasher';
import { NoopPasswordBreachChecker } from '@infrastructure/_shared/noop-password-breach-checker';
import { AuthController } from './user/controllers/auth.controller';
import { EmailModule } from './email.module';

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h', algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUserHandler,
    LoginHandler,
    RefreshAccessTokenHandler,
    LogoutHandler,
    RevokeSessionHandler,
    ListSessionsHandler,
    VerifyEmailHandler,
    RequestPasswordResetHandler,
    ResetPasswordHandler,
    IssueRefreshTokenService,
    JwtStrategy,
    RefreshTokenCleanupService,
    PasswordResetTokenCleanupService,
    EmailVerificationTokenCleanupService,
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    { provide: TOKEN_HASHER, useClass: Sha256TokenHasher },
    {
      provide: PASSWORD_BREACH_CHECKER,
      useClass: NoopPasswordBreachChecker,
    },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: PasswordResetTokenRepository,
    },
    {
      provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY,
      useClass: EmailVerificationTokenRepository,
    },
    { provide: TRANSACTION_RUNNER, useClass: PrismaTransactionRunner },
  ],
})
export class AuthModule {}
