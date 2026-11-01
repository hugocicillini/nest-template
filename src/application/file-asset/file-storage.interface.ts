import type { Readable } from 'stream';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

/**
 * Port for the actual file bytes, kept separate from IFileAssetRepository
 * (which only persists metadata). Swap the bound implementation (see
 * infrastructure/file-asset/local-file-storage.ts) for an S3-backed adapter
 * without touching schema, commands, or the API.
 */
export interface IFileStorage {
  save(storageKey: string, buffer: Buffer): Promise<void>;
  /** Streamed, not buffered - a download shouldn't hold the whole file in memory. */
  createReadStream(storageKey: string): Promise<Readable>;
  delete(storageKey: string): Promise<void>;
}
