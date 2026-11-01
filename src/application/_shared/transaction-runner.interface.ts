export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');

/**
 * Opaque handle for a single atomic unit of work - repository methods that
 * accept one join the same underlying transaction. Typed as unknown so this
 * port stays free of any ORM-specific type; only infrastructure-layer
 * repositories know how to interpret it.
 */
export type TransactionContext = unknown;

export interface ITransactionRunner {
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
