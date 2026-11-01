import type { Readable } from 'stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { IFileStorage } from '@application/file-asset/file-storage.interface';

const BUCKET = process.env.AWS_S3_BUCKET as string;
const client = new S3Client({ region: process.env.AWS_REGION });

/**
 * IFileStorage adapter backed by S3 - swap-in replacement for
 * LocalFileStorage for multi-instance/production deployments, where local
 * disk isn't shared/durable across instances. Credentials come from the
 * SDK's default provider chain (env vars, IAM role, etc.) - never passed
 * explicitly here.
 */
@Injectable()
export class S3FileStorage implements IFileStorage {
  async save(storageKey: string, buffer: Buffer): Promise<void> {
    await client.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: storageKey, Body: buffer }),
    );
  }

  async createReadStream(storageKey: string): Promise<Readable> {
    const response = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }),
    );
    // GetObjectCommand rejects on a missing key before any bytes stream -
    // the same "fail before headers are sent" guarantee LocalFileStorage
    // gets from its manual access() check, here for free.
    return response.Body as Readable;
  }

  async delete(storageKey: string): Promise<void> {
    await client.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }),
    );
  }
}
