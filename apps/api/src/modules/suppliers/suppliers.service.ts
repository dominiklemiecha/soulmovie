import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { ErrorCodes, SupplierUpdateDto } from '@soulmovie/shared';
import { Supplier } from './entities/supplier.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Injectable()
export class SuppliersService {
  constructor(private readonly ds: DataSource) {}

  async getOwn(supplierId: string): Promise<Supplier> {
    const s = await this.ds.getRepository(Supplier).findOne({ where: { id: supplierId } });
    if (!s) {
      throw new NotFoundException({
        error: { code: ErrorCodes.SUPPLIER_NOT_FOUND, message: 'Fornitore non trovato' },
      });
    }
    return s;
  }

  @Transactional()
  async updateOwn(
    supplierId: string,
    dto: SupplierUpdateDto,
    userId?: string,
    ip?: string,
    ua?: string,
  ): Promise<Supplier> {
    const repo = this.ds.getRepository(Supplier);
    const before = await repo.findOne({ where: { id: supplierId } });
    if (!before) {
      throw new NotFoundException({
        error: { code: ErrorCodes.SUPPLIER_NOT_FOUND, message: 'Fornitore non trovato' },
      });
    }
    Object.assign(before, dto, { updatedAt: new Date() });
    const after = await repo.save(before);
    await this.ds.getRepository(AuditLog).save({
      userId,
      supplierId,
      action: 'supplier.update',
      entityType: 'supplier',
      entityId: supplierId,
      before: dto,
      after: dto,
      ip,
      userAgent: ua,
    } as Partial<AuditLog>);
    await this.ds.getRepository(OutboxEvent).save({
      aggregateType: 'supplier',
      aggregateId: supplierId,
      eventType: 'supplier.upserted',
      payload: { id: supplierId },
    } as Partial<OutboxEvent>);
    return after;
  }
}
