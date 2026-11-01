import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ITokenHasher } from '@application/_shared/token-hasher.interface';

@Injectable()
export class Sha256TokenHasher implements ITokenHasher {
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
