import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  EmailAlreadyRegisteredException,
  UserNotFoundException,
} from '@domain/_shared/domain.exception';
import { Email } from '@domain/user/email.vo';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { UserDto, toUserDto } from '@application/user/dtos/user.dto';
import { CACHE } from '@application/_shared/cache.interface';
import type { ICache } from '@application/_shared/cache.interface';
import { userCacheKey } from '@application/user/user-cache-key';
import { UpdateUserCommand } from './update-user.command';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<
  UpdateUserCommand,
  UserDto
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(CACHE) private readonly cache: ICache,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UserDto> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    if (command.name !== undefined) {
      user.name = command.name;
    }

    if (command.email !== undefined) {
      const email = Email.create(command.email);
      if (await this.userRepository.emailExists(email.toString(), user.id)) {
        throw new EmailAlreadyRegisteredException(email.toString());
      }
      user.email = email.toString();
    }

    if (command.active !== undefined) {
      if (command.active) {
        user.activate();
      } else {
        user.deactivate();
      }
    }

    user.registerUpdate();

    const saved = await this.userRepository.save(user);
    await this.cache.del(userCacheKey(saved.id));

    return toUserDto(saved);
  }
}
