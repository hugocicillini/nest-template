import { RequestPasswordResetCommand } from '@application/password-reset/commands/request-password-reset/request-password-reset.command';
import { ResetPasswordCommand } from '@application/password-reset/commands/reset-password/reset-password.command';
import { LogoutCommand } from '@application/refresh-token/commands/logout/logout.command';
import { RefreshAccessTokenCommand } from '@application/refresh-token/commands/refresh-access-token/refresh-access-token.command';
import type { RefreshedTokens } from '@application/refresh-token/commands/refresh-access-token/refresh-access-token.handler';
import { RevokeSessionCommand } from '@application/refresh-token/commands/revoke-session/revoke-session.command';
import { ListSessionsQuery } from '@application/refresh-token/queries/list-sessions/list-sessions.query';
import type { SessionDto } from '@application/refresh-token/queries/list-sessions/list-sessions.handler';
import { REFRESH_TOKEN_TTL_MS } from '@application/refresh-token/issue-refresh-token.service';
import { LoginCommand } from '@application/user/commands/login/login.command';
import type { LoginResult } from '@application/user/commands/login/login.handler';
import { RegisterUserCommand } from '@application/user/commands/register-user/register-user.command';
import { VerifyEmailCommand } from '@application/user/commands/verify-email/verify-email.command';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../../_shared/decorators/current-user.decorator';
import { CurrentUser } from '../../_shared/decorators/current-user.decorator';
import { RefreshTokenCookie } from '../../_shared/decorators/refresh-token-cookie.decorator';
import { REFRESH_TOKEN_COOKIE_NAME } from '../../_shared/refresh-token-cookie.constant';
import { LoginDto } from '../dtos/login.schema';
import { RegisterUserDto } from '../dtos/register-user.schema';
import { RequestPasswordResetDto } from '../dtos/request-password-reset.schema';
import { ResetPasswordDto } from '../dtos/reset-password.schema';
import { VerifyEmailDto } from '../dtos/verify-email.schema';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterUserDto) {
    return this.commandBus.execute(
      new RegisterUserCommand(dto.name, dto.email, dto.password),
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const result: LoginResult = await this.commandBus.execute(
      new LoginCommand(dto.email, dto.password),
    );

    this.setRefreshTokenCookie(res, result.refreshToken);

    return { accessToken: result.accessToken };
  }

  @Post('refresh')
  async refresh(
    @RefreshTokenCookie() refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const result: RefreshedTokens = await this.commandBus.execute(
      new RefreshAccessTokenCommand(refreshToken),
    );

    this.setRefreshTokenCookie(res, result.refreshToken);

    return { accessToken: result.accessToken };
  }

  @Post('logout')
  async logout(
    @RefreshTokenCookie() refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.commandBus.execute(new LogoutCommand(refreshToken));
    // Must match the path setRefreshTokenCookie() below sets it with -
    // otherwise clearCookie's own instruction to the browser never matches
    // the cookie it's trying to clear. Tied to the /v1 prefix from
    // enableVersioning() in main.ts; bump both together on a version change.
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/v1/auth' });
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('request-password-reset')
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<Record<string, never>> {
    // Always 200/{} regardless of whether the email exists - matches the
    // handler's own silent no-op, so an unknown email can't be told apart
    // from a real one by status code or response shape.
    await this.commandBus.execute(new RequestPasswordResetCommand(dto.email));
    return {};
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.commandBus.execute(
      new ResetPasswordCommand(dto.token, dto.newPassword),
    );
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.commandBus.execute(new VerifyEmailCommand(dto.token));
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      // Real route is /v1/auth/* (enableVersioning in main.ts applies to
      // every controller unless it opts out, and this one doesn't) - a
      // plain '/auth' path here means the browser never re-attaches the
      // cookie to /v1/auth/refresh or /v1/auth/logout, silently breaking
      // both. Bump this alongside the API version if it ever changes.
      path: '/v1/auth',
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // Lists this user's own active sessions - built on the same
  // findActiveByUserId the 5-concurrent-session cap already relies on, just
  // exposed so a user can actually see/manage what that cap is capping.
  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  listSessions(@CurrentUser() user: AuthenticatedUser): Promise<SessionDto[]> {
    return this.queryBus.execute(new ListSessionsQuery(user.id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:sessionId')
  revokeSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new RevokeSessionCommand(sessionId, user.id),
    );
  }
}
