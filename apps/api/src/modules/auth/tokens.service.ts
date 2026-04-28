import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { v4 as uuid } from 'uuid';
import { OneTimeToken, OneTimeTokenPurpose } from './entities/one-time-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(OneTimeToken) private readonly otRepo: Repository<OneTimeToken>,
    @InjectRepository(RefreshToken) private readonly rtRepo: Repository<RefreshToken>,
  ) {}

  async issueOneTime(userId: string, purpose: OneTimeTokenPurpose, ttlMs: number): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    await this.otRepo.insert({
      userId,
      tokenHash: sha256(raw),
      purpose,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return raw;
  }

  async consumeOneTime(raw: string, purpose: OneTimeTokenPurpose): Promise<string> {
    const hash = sha256(raw);
    const row = await this.otRepo.findOne({ where: { tokenHash: hash, purpose } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new Error('invalid or expired token');
    }
    await this.otRepo.update(row.id, { usedAt: new Date() });
    return row.userId;
  }

  async issueRefresh(
    userId: string,
    familyId: string | null,
    ttlMs: number,
    ip?: string,
    ua?: string,
  ): Promise<{ raw: string; familyId: string }> {
    const raw = randomBytes(48).toString('hex');
    const fam = familyId ?? uuid();
    await this.rtRepo.insert({
      userId,
      tokenHash: sha256(raw),
      familyId: fam,
      expiresAt: new Date(Date.now() + ttlMs),
      ip: ip ?? null,
      userAgent: ua ?? null,
    });
    return { raw, familyId: fam };
  }

  async rotateRefresh(
    raw: string,
    ttlMs: number,
    ip?: string,
    ua?: string,
  ): Promise<{ userId: string; raw: string; familyId: string }> {
    const hash = sha256(raw);
    const row = await this.rtRepo.findOne({ where: { tokenHash: hash } });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw new Error('invalid token');
    }
    if (row.usedAt) {
      await this.rtRepo.update({ familyId: row.familyId }, { revokedAt: new Date() });
      throw new Error('token reuse detected');
    }
    await this.rtRepo.update(row.id, { usedAt: new Date() });
    const fresh = await this.issueRefresh(row.userId, row.familyId, ttlMs, ip, ua);
    return { userId: row.userId, ...fresh };
  }

  async revokeAllForUser(userId: string) {
    await this.rtRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }
}
