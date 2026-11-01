import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AccountLockedException,
  DomainException,
  EmailAlreadyRegisteredException,
  FileAssetNotFoundException,
  InvalidCredentialsException,
  InvalidEmailVerificationTokenException,
  InvalidFileTypeException,
  InvalidPasswordException,
  InvalidPasswordResetTokenException,
  InvalidRefreshTokenException,
  NotificationNotFoundException,
  RefreshTokenNotFoundException,
  PermissionAlreadyExistsException,
  PermissionNotFoundException,
  RoleAlreadyExistsException,
  RoleNotFoundException,
  UserInactiveException,
  UserNotFoundException,
} from '@domain/_shared/domain.exception';

type DomainExceptionConstructor = new (...args: never[]) => DomainException;

interface ExceptionMeta {
  status: number;
  code: string;
}

const DEFAULT_EXCEPTION_META: ExceptionMeta = {
  status: HttpStatus.BAD_REQUEST,
  code: 'DOMAIN_ERROR',
};

const EXCEPTION_META = new Map<DomainExceptionConstructor, ExceptionMeta>([
  [
    EmailAlreadyRegisteredException,
    { status: HttpStatus.CONFLICT, code: 'EMAIL_ALREADY_REGISTERED' },
  ],
  [
    InvalidCredentialsException,
    { status: HttpStatus.UNAUTHORIZED, code: 'INVALID_CREDENTIALS' },
  ],
  [
    AccountLockedException,
    { status: HttpStatus.LOCKED, code: 'ACCOUNT_LOCKED' },
  ],
  [
    UserInactiveException,
    { status: HttpStatus.FORBIDDEN, code: 'USER_INACTIVE' },
  ],
  [
    UserNotFoundException,
    { status: HttpStatus.NOT_FOUND, code: 'USER_NOT_FOUND' },
  ],
  [
    RoleAlreadyExistsException,
    { status: HttpStatus.CONFLICT, code: 'ROLE_ALREADY_EXISTS' },
  ],
  [
    RoleNotFoundException,
    { status: HttpStatus.NOT_FOUND, code: 'ROLE_NOT_FOUND' },
  ],
  [
    PermissionAlreadyExistsException,
    { status: HttpStatus.CONFLICT, code: 'PERMISSION_ALREADY_EXISTS' },
  ],
  [
    PermissionNotFoundException,
    { status: HttpStatus.NOT_FOUND, code: 'PERMISSION_NOT_FOUND' },
  ],
  [
    InvalidRefreshTokenException,
    { status: HttpStatus.UNAUTHORIZED, code: 'INVALID_REFRESH_TOKEN' },
  ],
  [
    NotificationNotFoundException,
    { status: HttpStatus.NOT_FOUND, code: 'NOTIFICATION_NOT_FOUND' },
  ],
  [
    RefreshTokenNotFoundException,
    { status: HttpStatus.NOT_FOUND, code: 'SESSION_NOT_FOUND' },
  ],
  [
    FileAssetNotFoundException,
    { status: HttpStatus.NOT_FOUND, code: 'FILE_ASSET_NOT_FOUND' },
  ],
  [
    InvalidPasswordResetTokenException,
    { status: HttpStatus.UNAUTHORIZED, code: 'INVALID_PASSWORD_RESET_TOKEN' },
  ],
  [
    InvalidEmailVerificationTokenException,
    {
      status: HttpStatus.UNAUTHORIZED,
      code: 'INVALID_EMAIL_VERIFICATION_TOKEN',
    },
  ],
  [
    InvalidFileTypeException,
    { status: HttpStatus.BAD_REQUEST, code: 'INVALID_FILE_TYPE' },
  ],
  [
    InvalidPasswordException,
    { status: HttpStatus.BAD_REQUEST, code: 'INVALID_PASSWORD' },
  ],
]);

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request & { id?: string }>();
    const { status, code } =
      EXCEPTION_META.get(exception.constructor as DomainExceptionConstructor) ??
      DEFAULT_EXCEPTION_META;

    response.status(status).json({
      statusCode: status,
      code,
      message: exception.message,
      requestId: request.id,
    });
  }
}
