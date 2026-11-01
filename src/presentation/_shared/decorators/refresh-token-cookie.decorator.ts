import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { REFRESH_TOKEN_COOKIE_NAME } from '../refresh-token-cookie.constant';

interface RequestWithCookies {
  cookies: Record<string, string | undefined>;
}

export const RefreshTokenCookie = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token cookie');
    }

    return refreshToken;
  },
);
