import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { ContactCreateDto, ContactUpdateDto, ErrorCodes } from '@soulmovie/shared';
import { SupplierContact } from './entities/supplier-contact.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Injectable()
export class ContactsService {
  constructor(private readonly ds: DataSource) {}

  list(supplierId: string) {
    return this.ds
      .getRepository(SupplierContact)
      .find({ where: { supplierId }, order: { isMain: 'DESC', cognome: 'ASC', nome: 'ASC' } });
  }

  async getOne(supplierId: string, id: string): Promise<SupplierContact> {
    const c = await this.ds
      .getRepository(SupplierContact)
      .findOne({ where: { id, supplierId } });
    if (!c) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Contatto non trovato' },
      });
    }
    return c;
  }

  @Transactional()
  async create(supplierId: string, dto: ContactCreateDto, userId?: string): Promise<SupplierContact> {
    const repo = this.ds.getRepository(SupplierContact);
    if (dto.isMain) await repo.update({ supplierId, isMain: true }, { isMain: false });
    const saved = await repo.save(repo.create({ ...dto, supplierId }));
    await this.audit(userId, supplierId, 'contact.create', saved.id, null, dto);
    await this.outbox(supplierId, 'contact.upserted', { id: saved.id });
    return saved;
  }

  @Transactional()
  async update(
    supplierId: string,
    id: string,
    dto: ContactUpdateDto,
    userId?: string,
  ): Promise<SupplierContact> {
    const repo = this.ds.getRepository(SupplierContact);
    const before = await repo.findOne({ where: { id, supplierId } });
    if (!before) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Contatto non trovato' },
      });
    }
    if (dto.isMain && !before.isMain) {
      await repo.update({ supplierId, isMain: true }, { isMain: false });
    }
    Object.assign(before, dto, { updatedAt: new Date() });
    const saved = await repo.save(before);
    await this.audit(userId, supplierId, 'contact.update', id, null, dto);
    await this.outbox(supplierId, 'contact.upserted', { id });
    return saved;
  }

  @Transactional()
  async remove(supplierId: string, id: string, userId?: string): Promise<void> {
    const repo = this.ds.getRepository(SupplierContact);
    const before = await repo.findOne({ where: { id, supplierId } });
    if (!before) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Contatto non trovato' },
      });
    }
    await repo.delete({ id, supplierId });
    await this.audit(userId, supplierId, 'contact.delete', id, before, null);
    await this.outbox(supplierId, 'contact.deleted', { id });
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
      entityType: 'supplier_contact',
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
}
