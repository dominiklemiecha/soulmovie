import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly log = new Logger(MinioService.name);
  private internal!: Client; // accesso server-side (host = "minio")
  private presigner!: Client; // genera URL con host pubblico (browser lo usa)
  private bucket!: string;

  constructor(private readonly cfg: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.bucket = this.cfg.get<string>('minio.bucket')!;

    this.internal = new Client({
      endPoint: this.cfg.get<string>('minio.endpoint')!,
      port: this.cfg.get<number>('minio.port')!,
      useSSL: this.cfg.get<boolean>('minio.useSSL')!,
      accessKey: this.cfg.get<string>('minio.accessKey')!,
      secretKey: this.cfg.get<string>('minio.secretKey')!,
      region: 'us-east-1',
    });

    const publicUrl = new URL(this.cfg.get<string>('minio.publicEndpoint')!);
    this.presigner = new Client({
      endPoint: publicUrl.hostname,
      port: parseInt(publicUrl.port || (publicUrl.protocol === 'https:' ? '443' : '80'), 10),
      useSSL: publicUrl.protocol === 'https:',
      accessKey: this.cfg.get<string>('minio.accessKey')!,
      secretKey: this.cfg.get<string>('minio.secretKey')!,
      region: 'us-east-1',
    });

    try {
      const exists = await this.internal.bucketExists(this.bucket);
      if (!exists) {
        await this.internal.makeBucket(this.bucket, 'us-east-1');
        this.log.log(`bucket "${this.bucket}" creato`);
      }
    } catch (e: any) {
      this.log.warn(`MinIO init: ${e?.message ?? e}`);
    }
  }

  buildObjectKey(supplierId: string, filename: string): string {
    const safe = filename.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200);
    return `suppliers/${supplierId}/certificates/${randomUUID()}-${safe}`;
  }

  presignedPut(key: string, expirySec = 5 * 60): Promise<string> {
    return this.presigner.presignedPutObject(this.bucket, key, expirySec);
  }

  presignedGet(key: string, expirySec = 10 * 60): Promise<string> {
    return this.presigner.presignedGetObject(this.bucket, key, expirySec);
  }

  statObject(key: string) {
    return this.internal.statObject(this.bucket, key);
  }

  async putObject(key: string, body: Buffer, mime: string): Promise<void> {
    await this.internal.putObject(this.bucket, key, body, body.length, {
      'Content-Type': mime,
    });
  }

  async getObjectStream(key: string) {
    return this.internal.getObject(this.bucket, key);
  }

  async removeObject(key: string): Promise<void> {
    try {
      await this.internal.removeObject(this.bucket, key);
    } catch (e: any) {
      this.log.warn(`removeObject ${key}: ${e?.message ?? e}`);
    }
  }
}
