import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from '@application/_shared/pagination';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { UserDto, toUserDto } from '@application/user/dtos/user.dto';
import { ListUsersQuery } from './list-users.query';

@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<
  ListUsersQuery,
  PaginatedResult<UserDto>
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: ListUsersQuery): Promise<PaginatedResult<UserDto>> {
    const result = await this.userRepository.findAll({
      page: query.page,
      limit: query.limit,
    });

    return {
      ...result,
      items: result.items.map(toUserDto),
    };
  }
}
