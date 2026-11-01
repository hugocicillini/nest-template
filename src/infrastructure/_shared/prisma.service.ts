import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@generated/prisma';

// The pg-pool default (also what this silently ran with before, since
// nothing overrode it).
const DEFAULT_POOL_SIZE = 10;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        // node-postgres parses this config itself and doesn't recognize
        // Prisma's legacy query-engine URL params (connection_limit,
        // pool_timeout, socket_timeout, ...) at all with a driver adapter in
        // play - they're silently ignored. Pool size and timeouts have to be
        // set here instead of in DATABASE_URL.
        max: process.env.DATABASE_POOL_SIZE
          ? Number(process.env.DATABASE_POOL_SIZE)
          : DEFAULT_POOL_SIZE,
        // Fail fast on a stuck connection attempt instead of hanging
        // indefinitely (pg's own default) when Postgres is unreachable.
        connectionTimeoutMillis: 10_000,
        // Caps how long any single query can hold a pool slot - without
        // this, one stuck query during a Postgres blip can exhaust the pool
        // for every other in-flight request.
        statement_timeout: 30_000,
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
