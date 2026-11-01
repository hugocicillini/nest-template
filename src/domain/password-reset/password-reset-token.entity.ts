export interface PasswordResetTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreatePasswordResetTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export class PasswordResetTokenEntity {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  usedAt: Date | null;
  readonly createdAt: Date;

  private constructor(props: PasswordResetTokenProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.tokenHash = props.tokenHash;
    this.expiresAt = props.expiresAt;
    this.usedAt = props.usedAt;
    this.createdAt = props.createdAt;
  }

  static create(
    props: CreatePasswordResetTokenProps,
  ): PasswordResetTokenEntity {
    return new PasswordResetTokenEntity({ ...props, usedAt: null });
  }

  static reconstitute(
    props: PasswordResetTokenProps,
  ): PasswordResetTokenEntity {
    return new PasswordResetTokenEntity(props);
  }

  isValid(): boolean {
    return this.usedAt === null && this.expiresAt.getTime() > Date.now();
  }

  markAsUsed(): void {
    this.usedAt = new Date();
  }
}
