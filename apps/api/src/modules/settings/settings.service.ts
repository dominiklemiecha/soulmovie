import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { SystemSetting } from './entities/system-setting.entity';

export type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  tls: boolean;
};

const SMTP_KEY = 'smtp.config';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting) private readonly repo: Repository<SystemSetting>,
    private readonly crypto: CryptoService,
  ) {}

  async getSmtp(): Promise<SmtpSettings | null> {
    const row = await this.repo.findOne({ where: { key: SMTP_KEY } });
    if (!row) return null;
    return JSON.parse(this.crypto.decrypt(row.valueEncrypted));
  }

  async setSmtp(value: SmtpSettings, updatedBy: string): Promise<void> {
    const enc = this.crypto.encrypt(JSON.stringify(value));
    await this.repo.upsert(
      { key: SMTP_KEY, valueEncrypted: enc, updatedBy, updatedAt: new Date() },
      ['key'],
    );
  }
}
