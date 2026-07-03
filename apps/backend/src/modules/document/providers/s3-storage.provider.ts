import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { PresignedUpload, StorageProvider } from '../ports/storage-provider.port';

const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;
const DOWNLOAD_URL_EXPIRY_SECONDS = 5 * 60;

@Injectable()
export class S3StorageProvider implements StorageProvider, OnModuleInit {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('STORAGE_BUCKET');
    this.client = new S3Client({
      endpoint: config.getOrThrow<string>('STORAGE_ENDPOINT'),
      region: config.getOrThrow<string>('STORAGE_REGION'),
      forcePathStyle: config.get<boolean>('STORAGE_FORCE_PATH_STYLE', true),
      credentials: {
        accessKeyId: config.getOrThrow<string>('STORAGE_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('STORAGE_SECRET_ACCESS_KEY'),
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async createPresignedUpload(mimeType: string): Promise<PresignedUpload> {
    const storageKey = `documents/${randomUUID()}`;
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: storageKey, ContentType: mimeType }),
      { expiresIn: UPLOAD_URL_EXPIRY_SECONDS },
    );
    return { storageKey, uploadUrl };
  }

  async objectExists(storageKey: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }));
      return true;
    } catch {
      return false;
    }
  }

  createPresignedDownload(storageKey: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }), {
      expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS,
    });
  }
}
