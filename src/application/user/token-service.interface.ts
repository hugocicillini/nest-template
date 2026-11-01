import { UserEntity } from '@domain/user/user.entity';

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface ITokenService {
  generateToken(user: UserEntity): Promise<string>;
}
