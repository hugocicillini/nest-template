export abstract class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class EmailAlreadyRegisteredException extends DomainException {
  constructor(email: string) {
    super(`Email "${email}" is already registered`);
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid email or password');
  }
}

export class AccountLockedException extends DomainException {
  constructor() {
    super('Account temporarily locked due to too many failed login attempts');
  }
}

export class InvalidPasswordException extends DomainException {
  constructor(reason: string) {
    super(reason);
  }
}

export class UserInactiveException extends DomainException {
  constructor() {
    super('User is inactive');
  }
}

export class UserNotFoundException extends DomainException {
  constructor(userId: string) {
    super(`User "${userId}" not found`);
  }
}

export class RoleAlreadyExistsException extends DomainException {
  constructor(name: string) {
    super(`Role "${name}" already exists`);
  }
}

export class RoleNotFoundException extends DomainException {
  constructor(roleId: string) {
    super(`Role "${roleId}" not found`);
  }
}

export class PermissionAlreadyExistsException extends DomainException {
  constructor(name: string) {
    super(`Permission "${name}" already exists`);
  }
}

export class PermissionNotFoundException extends DomainException {
  constructor(permissionId: string) {
    super(`Permission "${permissionId}" not found`);
  }
}

export class InvalidRefreshTokenException extends DomainException {
  constructor() {
    super('Invalid or expired refresh token');
  }
}

export class RefreshTokenNotFoundException extends DomainException {
  constructor(sessionId: string) {
    super(`Session "${sessionId}" not found`);
  }
}

export class NotificationNotFoundException extends DomainException {
  constructor(notificationId: string) {
    super(`Notification "${notificationId}" not found`);
  }
}

export class FileAssetNotFoundException extends DomainException {
  constructor(fileAssetId: string) {
    super(`File "${fileAssetId}" not found`);
  }
}

export class InvalidPasswordResetTokenException extends DomainException {
  constructor() {
    super('Invalid or expired password reset token');
  }
}

export class InvalidEmailVerificationTokenException extends DomainException {
  constructor() {
    super('Invalid or expired email verification token');
  }
}

export class InvalidFileTypeException extends DomainException {
  constructor(detectedMimeType: string | null) {
    super(
      detectedMimeType
        ? `File type "${detectedMimeType}" is not allowed`
        : 'File type could not be determined',
    );
  }
}
