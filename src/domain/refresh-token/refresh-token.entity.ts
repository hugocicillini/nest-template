export interface RefreshTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateRefreshTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export class RefreshTokenEntity {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  revokedAt: Date | null;
  readonly createdAt: Date;

  private constructor(props: RefreshTokenProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.tokenHash = props.tokenHash;
    this.expiresAt = props.expiresAt;
    this.revokedAt = props.revokedAt;
    this.createdAt = props.createdAt;
  }

  static create(props: CreateRefreshTokenProps): RefreshTokenEntity {
    return new RefreshTokenEntity({ ...props, revokedAt: null });
  }

  static reconstitute(props: RefreshTokenProps): RefreshTokenEntity {
    return new RefreshTokenEntity(props);
  }

  isValid(): boolean {
    return this.revokedAt === null && this.expiresAt.getTime() > Date.now();
  }

  revoke(): void {
    this.revokedAt = new Date();
  }
}
