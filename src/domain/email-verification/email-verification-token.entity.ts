export interface EmailVerificationTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreateEmailVerificationTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export class EmailVerificationTokenEntity {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  usedAt: Date | null;
  readonly createdAt: Date;

  private constructor(props: EmailVerificationTokenProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.tokenHash = props.tokenHash;
    this.expiresAt = props.expiresAt;
    this.usedAt = props.usedAt;
    this.createdAt = props.createdAt;
  }

  static create(
    props: CreateEmailVerificationTokenProps,
  ): EmailVerificationTokenEntity {
    return new EmailVerificationTokenEntity({ ...props, usedAt: null });
  }

  static reconstitute(
    props: EmailVerificationTokenProps,
  ): EmailVerificationTokenEntity {
    return new EmailVerificationTokenEntity(props);
  }

  isValid(): boolean {
    return this.usedAt === null && this.expiresAt.getTime() > Date.now();
  }

  markAsUsed(): void {
    this.usedAt = new Date();
  }
}
