import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { ApprovalStatus, ErrorCodes, UserStatus } from '@soulmovie/shared';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';
import { MailService } from '../../infra/mail/mail.service';

@Injectable()
export class AdminSuppliersService {
  constructor(
    private readonly ds: DataSource,
    private readonly mail: MailService,
  ) {}

  async listByStatus(
    status: ApprovalStatus | 'all',
    page = 1,
    pageSize = 50,
    q?: string,
  ) {
    const repo = this.ds.getRepository(Supplier);
    const qb = repo.createQueryBuilder('s').orderBy('s.created_at', 'DESC');
    if (status !== 'all') qb.andWhere('s.approval_status = :status', { status });
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      qb.andWhere(
        '(s.ragione_sociale ILIKE :like OR s.partita_iva ILIKE :like OR s.codice_fiscale ILIKE :like OR s.citta ILIKE :like)',
        { like },
      );
    }
    const total = await qb.getCount();
    const suppliers = await qb.skip((page - 1) * pageSize).take(pageSize).getMany();
    if (suppliers.length === 0) return { items: [], total, page, pageSize };
    const users = await this.ds
      .getRepository(User)
      .createQueryBuilder('u')
      .select(['u.email AS email', 'u.supplier_id AS supplier_id'])
      .where('u.supplier_id IN (:...ids)', { ids: suppliers.map((s) => s.id) })
      .getRawMany<{ email: string; supplier_id: string }>();
    const emailBySupplier = new Map(users.map((u) => [u.supplier_id, u.email]));
    const items = suppliers.map((s) => ({ ...s, userEmail: emailBySupplier.get(s.id) ?? null }));
    return { items, total, page, pageSize };
  }

  async getById(id: string): Promise<Supplier> {
    const s = await this.ds.getRepository(Supplier).findOne({ where: { id } });
    if (!s) {
      throw new NotFoundException({
        error: { code: ErrorCodes.SUPPLIER_NOT_FOUND, message: 'Fornitore non trovato' },
      });
    }
    return s;
  }

  @Transactional()
  async approve(id: string, adminUserId: string): Promise<Supplier> {
    const repo = this.ds.getRepository(Supplier);
    const s = await repo.findOne({ where: { id } });
    if (!s) {
      throw new NotFoundException({
        error: { code: ErrorCodes.SUPPLIER_NOT_FOUND, message: 'Fornitore non trovato' },
      });
    }
    if (s.approvalStatus !== ApprovalStatus.PENDING) {
      throw new ConflictException({
        error: {
          code: ErrorCodes.SUPPLIER_ALREADY_PROCESSED,
          message: `Fornitore già ${s.approvalStatus}`,
        },
      });
    }
    const before = { approvalStatus: s.approvalStatus };
    s.approvalStatus = ApprovalStatus.APPROVED;
    s.approvedAt = new Date();
    s.approvedBy = adminUserId;
    s.updatedAt = new Date();
    const saved = await repo.save(s);

    await this.ds.getRepository(AuditLog).save({
      userId: adminUserId,
      supplierId: id,
      action: 'supplier.approve',
      entityType: 'supplier',
      entityId: id,
      before,
      after: { approvalStatus: ApprovalStatus.APPROVED },
    } as Partial<AuditLog>);
    await this.ds.getRepository(OutboxEvent).save({
      aggregateType: 'supplier',
      aggregateId: id,
      eventType: 'supplier.approved',
      payload: { id },
    } as Partial<OutboxEvent>);

    const userRepo = this.ds.getRepository(User);
    const user = await userRepo.findOne({ where: { supplierId: id } });
    if (user) {
      await this.mail
        .send({
          to: user.email,
          subject: 'Account approvato — Soulmovie',
          html: `<p>Ciao,</p><p>il tuo account fornitore è stato approvato. Puoi accedere all'area riservata.</p>`,
        })
        .catch(() => {});
    }
    return saved;
  }

  @Transactional()
  async disable(id: string, adminUserId: string, reason?: string): Promise<Supplier> {
    const repo = this.ds.getRepository(Supplier);
    const s = await repo.findOne({ where: { id } });
    if (!s) {
      throw new NotFoundException({
        error: { code: ErrorCodes.SUPPLIER_NOT_FOUND, message: 'Fornitore non trovato' },
      });
    }
    const before = { approvalStatus: s.approvalStatus };
    s.approvalStatus = ApprovalStatus.REJECTED;
    s.updatedAt = new Date();
    const saved = await repo.save(s);
    await this.ds
      .getRepository(User)
      .update({ supplierId: id }, { status: UserStatus.DISABLED, updatedAt: new Date() });
    await this.ds.getRepository(AuditLog).save({
      userId: adminUserId,
      supplierId: id,
      action: 'supplier.disable',
      entityType: 'supplier',
      entityId: id,
      before,
      after: { approvalStatus: ApprovalStatus.REJECTED, reason: reason ?? null },
    } as Partial<AuditLog>);
    await this.ds.getRepository(OutboxEvent).save({
      aggregateType: 'supplier',
      aggregateId: id,
      eventType: 'supplier.disabled',
      payload: { id },
    } as Partial<OutboxEvent>);
    return saved;
  }

  @Transactional()
  async reactivate(id: string, adminUserId: string): Promise<Supplier> {
    const repo = this.ds.getRepository(Supplier);
    const s = await repo.findOne({ where: { id } });
    if (!s) {
      throw new NotFoundException({
        error: { code: ErrorCodes.SUPPLIER_NOT_FOUND, message: 'Fornitore non trovato' },
      });
    }
    const before = { approvalStatus: s.approvalStatus };
    s.approvalStatus = ApprovalStatus.APPROVED;
    s.approvedAt = s.approvedAt ?? new Date();
    s.approvedBy = adminUserId;
    s.updatedAt = new Date();
    const saved = await repo.save(s);
    await this.ds
      .getRepository(User)
      .update({ supplierId: id }, { status: UserStatus.ACTIVE, updatedAt: new Date() });
    await this.ds.getRepository(AuditLog).save({
      userId: adminUserId,
      supplierId: id,
      action: 'supplier.reactivate',
      entityType: 'supplier',
      entityId: id,
      before,
      after: { approvalStatus: ApprovalStatus.APPROVED },
    } as Partial<AuditLog>);
    return saved;
  }

  @Transactional()
  async remove(id: string, adminUserId: string): Promise<void> {
    const repo = this.ds.getRepository(Supplier);
    const s = await repo.findOne({ where: { id } });
    if (!s) {
      throw new NotFoundException({
        error: { code: ErrorCodes.SUPPLIER_NOT_FOUND, message: 'Fornitore non trovato' },
      });
    }
    // L'audit va scritto PRIMA della cancellazione (FK supplier_id non bloccante: nullabile)
    await this.ds.getRepository(AuditLog).save({
      userId: adminUserId,
      supplierId: id,
      action: 'supplier.delete',
      entityType: 'supplier',
      entityId: id,
      before: s,
      after: null,
    } as Partial<AuditLog>);
    // Cancella users collegati (FK ON DELETE CASCADE su users)
    await repo.delete({ id });
  }

  @Transactional()
  async reject(id: string, adminUserId: string, reason: string): Promise<Supplier> {
    const repo = this.ds.getRepository(Supplier);
    const s = await repo.findOne({ where: { id } });
    if (!s) {
      throw new NotFoundException({
        error: { code: ErrorCodes.SUPPLIER_NOT_FOUND, message: 'Fornitore non trovato' },
      });
    }
    if (s.approvalStatus !== ApprovalStatus.PENDING) {
      throw new ConflictException({
        error: {
          code: ErrorCodes.SUPPLIER_ALREADY_PROCESSED,
          message: `Fornitore già ${s.approvalStatus}`,
        },
      });
    }
    const before = { approvalStatus: s.approvalStatus };
    s.approvalStatus = ApprovalStatus.REJECTED;
    s.approvedAt = new Date();
    s.approvedBy = adminUserId;
    s.updatedAt = new Date();
    const saved = await repo.save(s);

    await this.ds.getRepository(AuditLog).save({
      userId: adminUserId,
      supplierId: id,
      action: 'supplier.reject',
      entityType: 'supplier',
      entityId: id,
      before,
      after: { approvalStatus: ApprovalStatus.REJECTED, reason },
    } as Partial<AuditLog>);
    await this.ds.getRepository(OutboxEvent).save({
      aggregateType: 'supplier',
      aggregateId: id,
      eventType: 'supplier.rejected',
      payload: { id, reason },
    } as Partial<OutboxEvent>);

    const userRepo = this.ds.getRepository(User);
    const user = await userRepo.findOne({ where: { supplierId: id } });
    if (user) {
      await this.mail
        .send({
          to: user.email,
          subject: 'Registrazione respinta — Soulmovie',
          html: `<p>Ciao,</p><p>la tua registrazione è stata respinta.</p><p><strong>Motivo:</strong> ${reason}</p>`,
        })
        .catch(() => {});
    }
    return saved;
  }
}
