import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserNotFoundException } from '@domain/_shared/domain.exception';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { UserDto, toUserDto } from '@application/user/dtos/user.dto';
import { CACHE } from '@application/_shared/cache.interface';
import type { ICache } from '@application/_shared/cache.interface';
import {
  USER_CACHE_TTL_SECONDS,
  userCacheKey,
} from '@application/user/user-cache-key';
import { GetUserQuery } from './get-user.query';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery, UserDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(CACHE) private readonly cache: ICache,
  ) {}

  async execute(query: GetUserQuery): Promise<UserDto> {
    const cacheKey = userCacheKey(query.userId);
    const cached = await this.cache.get<UserDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findById(query.userId);
    if (!user) {
      throw new UserNotFoundException(query.userId);
    }

    const dto = toUserDto(user);
    await this.cache.set(cacheKey, dto, USER_CACHE_TTL_SECONDS);

    return dto;
  }
}
