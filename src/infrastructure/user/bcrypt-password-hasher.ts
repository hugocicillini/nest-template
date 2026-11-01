import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IPasswordHasher } from '@application/user/password-hasher.interface';

const SALT_ROUNDS = 10;

// bcrypt silently truncates input at 72 bytes - anything beyond that is
// simply ignored, meaning two different passwords sharing the same 72-byte
// prefix would hash identically. Guard here so this holds regardless of
// which caller/DTO validated the input.
const MAX_PASSWORD_BYTES = 72;

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  hash(plainText: string): Promise<string> {
    if (Buffer.byteLength(plainText, 'utf8') > MAX_PASSWORD_BYTES) {
      throw new Error(
        `Password exceeds the maximum supported length of ${MAX_PASSWORD_BYTES} bytes`,
      );
    }

    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
