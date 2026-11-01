import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { REFRESH_TOKEN_REPOSITORY } from '@application/refresh-token/refresh-token-repository.interface';
import type { IRefreshTokenRepository } from '@application/refresh-token/refresh-token-repository.interface';
import { ListSessionsQuery } from './list-sessions.query';

export interface SessionDto {
  id: string;
  createdAt: Date;
  expiresAt: Date;
}

@QueryHandler(ListSessionsQuery)
export class ListSessionsHandler implements IQueryHandler<
  ListSessionsQuery,
  SessionDto[]
> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(query: ListSessionsQuery): Promise<SessionDto[]> {
    const sessions = await this.refreshTokenRepository.findActiveByUserId(
      query.userId,
    );

    return sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }
}
