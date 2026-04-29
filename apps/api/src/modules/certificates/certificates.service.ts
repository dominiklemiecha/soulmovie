import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import {
  CertificateCreateDto,
  CertificateStatus,
  CertificateUpdateDto,
  ErrorCodes,
} from '@soulmovie/shared';
import { Certificate } from './entities/certificate.entity';
import { CertificateType } from './entities/certificate-type.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { MinioService } from '../../infra/minio/minio.service';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly ds: DataSource,
    private readonly minio: MinioService,
  ) {}

  async listForSupplier(supplierId: string) {
    const items = await this.ds
      .getRepository(Certificate)
      .find({ where: { supplierId }, order: { dataScadenza: 'ASC', createdAt: 'DESC' } });
    return items.map((c) => this.attachComputedStatus(c));
  }

  async getOne(supplierId: string, id: string) {
    const c = await this.ds
      .getRepository(Certificate)
      .findOne({ where: { id, supplierId } });
    if (!c) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Certificato non trovato' },
      });
    }
    return this.attachComputedStatus(c);
  }

  async getDownloadUrl(supplierId: string, id: string): Promise<string> {
    const c = await this.getOne(supplierId, id);
    return this.minio.presignedGet(c.documentObjectKey);
  }

  @Transactional()
  async create(
    supplierId: string,
    dto: CertificateCreateDto,
    userId?: string,
  ): Promise<Certificate> {
    const typeOk = await this.ds
      .getRepository(CertificateType)
      .findOne({ where: { id: dto.typeId, active: true } });
    if (!typeOk) {
      throw new UnprocessableEntityException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Tipologia non valida' },
      });
    }
    if (typeOk.requiresExpiry && !dto.dataScadenza) {
      throw new UnprocessableEntityException({
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Data scadenza obbligatoria per questa tipologia',
        },
      });
    }

    try {
      await this.minio.statObject(dto.documentObjectKey);
    } catch {
      throw new UnprocessableEntityException({
        error: { code: ErrorCodes.CERT_OBJECT_NOT_FOUND, message: 'File non trovato su storage' },
      });
    }

    const repo = this.ds.getRepository(Certificate);
    const saved = await repo.save(
      repo.create({
        supplierId,
        ...dto,
        documentSize: String(dto.documentSize),
        status: typeOk.requiresExpiry
          ? this.computeStatus(dto.dataScadenza ?? null)
          : CertificateStatus.NO_EXPIRY,
      }),
    );
    await this.audit(userId, supplierId, 'certificate.create', saved.id, null, dto);
    await this.outbox(supplierId, 'certificate.upserted', { id: saved.id });
    return this.attachComputedStatus(saved);
  }

  @Transactional()
  async update(
    supplierId: string,
    id: string,
    dto: CertificateUpdateDto,
    userId?: string,
  ): Promise<Certificate> {
    const repo = this.ds.getRepository(Certificate);
    const cur = await repo.findOne({ where: { id, supplierId } });
    if (!cur) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Certificato non trovato' },
      });
    }
    let requiresExpiry = true;
    if (dto.typeId) {
      const t = await this.ds
        .getRepository(CertificateType)
        .findOne({ where: { id: dto.typeId, active: true } });
      if (!t) {
        throw new UnprocessableEntityException({
          error: { code: ErrorCodes.NOT_FOUND, message: 'Tipologia non valida' },
        });
      }
      requiresExpiry = t.requiresExpiry;
    } else {
      const t = await this.ds
        .getRepository(CertificateType)
        .findOne({ where: { id: cur.typeId } });
      requiresExpiry = t?.requiresExpiry ?? true;
    }
    Object.assign(cur, dto);
    cur.status = requiresExpiry
      ? this.computeStatus(cur.dataScadenza ?? null)
      : CertificateStatus.NO_EXPIRY;
    cur.updatedAt = new Date();
    const saved = await repo.save(cur);
    await this.audit(userId, supplierId, 'certificate.update', id, null, dto);
    await this.outbox(supplierId, 'certificate.upserted', { id });
    return this.attachComputedStatus(saved);
  }

  @Transactional()
  async remove(supplierId: string, id: string, userId?: string): Promise<void> {
    const repo = this.ds.getRepository(Certificate);
    const cur = await repo.findOne({ where: { id, supplierId } });
    if (!cur) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Certificato non trovato' },
      });
    }
    await repo.delete({ id, supplierId });
    await this.minio.removeObject(cur.documentObjectKey);
    await this.audit(userId, supplierId, 'certificate.delete', id, cur, null);
    await this.outbox(supplierId, 'certificate.deleted', { id });
  }

  private async audit(
    userId: string | undefined,
    supplierId: string,
    action: string,
    entityId: string,
    before: any,
    after: any,
  ) {
    await this.ds.getRepository(AuditLog).save({
      userId,
      supplierId,
      action,
      entityType: 'certificate',
      entityId,
      before,
      after,
    } as Partial<AuditLog>);
  }

  private async outbox(supplierId: string, eventType: string, payload: object) {
    await this.ds.getRepository(OutboxEvent).save({
      aggregateType: 'supplier',
      aggregateId: supplierId,
      eventType,
      payload,
    } as Partial<OutboxEvent>);
  }

  private computeStatus(scadenza: string | null): CertificateStatus {
    if (!scadenza) return CertificateStatus.NO_EXPIRY;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(scadenza);
    exp.setHours(0, 0, 0, 0);
    const days = Math.floor((exp.getTime() - today.getTime()) / 86_400_000);
    if (days < 0) return CertificateStatus.EXPIRED;
    if (days <= 7) return CertificateStatus.EXPIRING_7;
    if (days <= 30) return CertificateStatus.EXPIRING_30;
    if (days <= 60) return CertificateStatus.EXPIRING_60;
    return CertificateStatus.VALID;
  }

  private attachComputedStatus(c: Certificate): Certificate {
    if (c.status === CertificateStatus.NO_EXPIRY || c.status === CertificateStatus.INVALID) return c;
    c.status = this.computeStatus(c.dataScadenza ?? null);
    return c;
  }
}
