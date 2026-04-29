import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Role } from '@soulmovie/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';

@Controller('admin/audit')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminAuditController {
  constructor(private readonly ds: DataSource) {}

  @Get()
  async list(
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('supplierId') supplierId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const ps = Math.min(200, Math.max(1, parseInt(pageSize ?? '50', 10) || 50));
    const qb = this.ds
      .getRepository(AuditLog)
      .createQueryBuilder('a')
      .orderBy('a.createdAt', 'DESC');
    if (action) qb.andWhere('a.action ILIKE :a', { a: `%${action}%` });
    if (entityType) qb.andWhere('a.entityType = :et', { et: entityType });
    if (supplierId) qb.andWhere('a.supplierId = :sid', { sid: supplierId });
    if (userId) qb.andWhere('a.userId = :uid', { uid: userId });
    const total = await qb.getCount();
    const items = await qb.skip((p - 1) * ps).take(ps).getMany();
    if (items.length === 0) return { items: [], total, page: p, pageSize: ps };

    const userIds = Array.from(new Set(items.map((i) => i.userId).filter((x): x is string => !!x)));
    const supplierIds = Array.from(
      new Set(items.map((i) => i.supplierId).filter((x): x is string => !!x)),
    );
    const users = userIds.length
      ? await this.ds.getRepository(User).find({ where: { id: In(userIds) }, select: ['id', 'email'] })
      : [];
    const supps = supplierIds.length
      ? await this.ds
          .getRepository(Supplier)
          .find({ where: { id: In(supplierIds) }, select: ['id', 'ragioneSociale'] })
      : [];
    const userById = new Map(users.map((u) => [u.id, u.email]));
    const suppById = new Map(supps.map((s) => [s.id, s.ragioneSociale]));
    const out = items.map((i) => ({
      ...i,
      userEmail: i.userId ? userById.get(i.userId) ?? null : null,
      supplierName: i.supplierId ? suppById.get(i.supplierId) ?? null : null,
    }));
    return { items: out, total, page: p, pageSize: ps };
  }
}
