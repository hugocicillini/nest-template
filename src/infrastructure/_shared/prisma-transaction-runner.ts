import { Injectable } from '@nestjs/common';
import {
  ITransactionRunner,
  TransactionContext,
} from '@application/_shared/transaction-runner.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaTransactionRunner implements ITransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => work(tx));
  }
}
