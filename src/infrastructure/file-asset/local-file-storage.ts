import { resolve, sep } from 'path';
import { createReadStream } from 'fs';
import { access, mkdir, rm, writeFile } from 'fs/promises';
import type { Readable } from 'stream';
import { Injectable } from '@nestjs/common';
import { IFileStorage } from '@application/file-asset/file-storage.interface';

const UPLOAD_DIR = resolve(process.cwd(), 'uploads');

/**
 * Confines the resolved path to UPLOAD_DIR regardless of what storageKey
 * contains. storageKey is derived from a client-supplied file name
 * upstream (see upload-file.handler.ts) - this is the storage adapter's
 * own last line of defense against a "../../etc/x"-style key, independent
 * of whether the caller already sanitized it.
 */
function resolveWithinUploadDir(storageKey: string): string {
  const resolvedPath = resolve(UPLOAD_DIR, storageKey);
  if (
    resolvedPath !== UPLOAD_DIR &&
    !resolvedPath.startsWith(UPLOAD_DIR + sep)
  ) {
    throw new Error(
      `Invalid storage key "${storageKey}": resolves outside the upload directory`,
    );
  }
  return resolvedPath;
}

/**
 * Default IFileStorage adapter: stores bytes on local disk. Fine for a
 * single-instance/dev deployment; swap for an S3-compatible adapter
 * implementing the same interface for multi-instance/production use.
 */
@Injectable()
export class LocalFileStorage implements IFileStorage {
  async save(storageKey: string, buffer: Buffer): Promise<void> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(resolveWithinUploadDir(storageKey), buffer);
  }

  async createReadStream(storageKey: string): Promise<Readable> {
    const resolvedPath = resolveWithinUploadDir(storageKey);
    // Surfaces a missing file as a clean rejection here, before any
    // response headers are sent - a stream 'error' event emitted mid-pipe
    // (after headers/status are already on the wire) can't be turned into
    // a normal HTTP error response anymore.
    await access(resolvedPath);
    return createReadStream(resolvedPath);
  }

  async delete(storageKey: string): Promise<void> {
    await rm(resolveWithinUploadDir(storageKey), { force: true });
  }
}
