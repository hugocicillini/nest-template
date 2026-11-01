import { UserEntity } from '@domain/user/user.entity';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  active: boolean;
  emailVerified: boolean;
}

export function toUserDto(user: UserEntity): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    active: user.active,
    emailVerified: user.emailVerifiedAt !== null,
  };
}
