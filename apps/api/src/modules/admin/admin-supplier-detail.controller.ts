import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { CertificateStatus, Role } from '@soulmovie/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SupplierContact } from '../contacts/entities/supplier-contact.entity';
import { SupplierCategory } from '../categories/entities/supplier-category.entity';
import { Category } from '../categories/entities/category.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { CertificateType } from '../certificates/entities/certificate-type.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import { MinioService } from '../../infra/minio/minio.service';

@Controller('admin/suppliers')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminSupplierDetailController {
  constructor(
    private readonly ds: DataSource,
    private readonly minio: MinioService,
  ) {}

  @Get(':id/users')
  async users(@Param('id', ParseUUIDPipe) id: string) {
    return this.ds
      .getRepository(User)
      .find({
        where: { supplierId: id },
        select: ['id', 'email', 'status', 'emailVerifiedAt', 'lastLoginAt', 'createdAt'],
        order: { createdAt: 'ASC' },
      });
  }

  @Get(':id/contacts')
  contacts(@Param('id', ParseUUIDPipe) id: string) {
    return this.ds
      .getRepository(SupplierContact)
      .find({ where: { supplierId: id }, order: { isMain: 'DESC', cognome: 'ASC' } });
  }

  @Get(':id/categories')
  async categories(@Param('id', ParseUUIDPipe) id: string) {
    const links = await this.ds.getRepository(SupplierCategory).find({ where: { supplierId: id } });
    if (links.length === 0) return [];
    const cats = await this.ds
      .getRepository(Category)
      .findBy({ id: In(links.map((l) => l.categoryId)) });
    return cats;
  }

  @Get(':id/certificates')
  async certificates(@Param('id', ParseUUIDPipe) id: string) {
    const items = await this.ds
      .getRepository(Certificate)
      .find({ where: { supplierId: id }, order: { dataScadenza: 'ASC', createdAt: 'DESC' } });
    return items.map((c) => attachComputedStatus(c));
  }

  @Get(':id/certificates/:cid/download-url')
  async certDownload(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('cid', ParseUUIDPipe) cid: string,
  ) {
    const c = await this.ds
      .getRepository(Certificate)
      .findOne({ where: { id: cid, supplierId: id } });
    if (!c) return { url: null };
    const url = await this.minio.presignedGet(c.documentObjectKey);
    return { url };
  }

}

@Controller('admin/certificates')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminCertificatesController {
  constructor(private readonly ds: DataSource) {}

  @Get()
  async list(
    @Query('window') window?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const ps = Math.min(200, Math.max(1, parseInt(pageSize ?? '100', 10) || 100));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isoToday = today.toISOString().slice(0, 10);
    const plus = (d: number) => {
      const x = new Date(today);
      x.setDate(x.getDate() + d);
      return x.toISOString().slice(0, 10);
    };

    const certRepo = this.ds.getRepository(Certificate);
    const qb = certRepo.createQueryBuilder('c').orderBy('c.dataScadenza', 'ASC');
    if (window === 'expired') qb.andWhere('c.dataScadenza < :today', { today: isoToday });
    else if (window === '7')
      qb.andWhere('c.dataScadenza BETWEEN :today AND :end', { today: isoToday, end: plus(7) });
    else if (window === '30')
      qb.andWhere('c.dataScadenza BETWEEN :today AND :end', { today: isoToday, end: plus(30) });
    else if (window === '60')
      qb.andWhere('c.dataScadenza BETWEEN :today AND :end', { today: isoToday, end: plus(60) });

    let suppIdsFilter: string[] | null = null;
    let typeIdsFilter: string[] | null = null;
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      const supps = await this.ds
        .getRepository(Supplier)
        .createQueryBuilder('s')
        .select('s.id', 'id')
        .where('s.ragioneSociale ILIKE :like OR s.partitaIva ILIKE :like', { like })
        .getRawMany<{ id: string }>();
      const types = await this.ds
        .getRepository(CertificateType)
        .createQueryBuilder('t')
        .select('t.id', 'id')
        .where('t.name ILIKE :like OR t.code ILIKE :like', { like })
        .getRawMany<{ id: string }>();
      suppIdsFilter = supps.map((s) => s.id);
      typeIdsFilter = types.map((t) => t.id);
      const whereOr: string[] = [];
      const params: any = {};
      if (suppIdsFilter.length > 0) {
        whereOr.push('c.supplierId IN (:...sids)');
        params.sids = suppIdsFilter;
      }
      if (typeIdsFilter.length > 0) {
        whereOr.push('c.typeId IN (:...tids)');
        params.tids = typeIdsFilter;
      }
      if (whereOr.length === 0) {
        return { items: [], total: 0, page: p, pageSize: ps };
      }
      qb.andWhere(`(${whereOr.join(' OR ')})`, params);
    }

    const total = await qb.getCount();
    const items = await qb.skip((p - 1) * ps).take(ps).getMany();
    if (items.length === 0) return { items: [], total, page: p, pageSize: ps };

    const supplierIds = Array.from(new Set(items.map((i) => i.supplierId)));
    const typeIds = Array.from(new Set(items.map((i) => i.typeId)));
    const supps = await this.ds
      .getRepository(Supplier)
      .createQueryBuilder('s')
      .select(['s.id AS id', 's.ragioneSociale AS ragione_sociale', 's.partitaIva AS partita_iva'])
      .where('s.id IN (:...ids)', { ids: supplierIds })
      .getRawMany<{ id: string; ragione_sociale: string; partita_iva: string | null }>();
    const types = await this.ds
      .getRepository(CertificateType)
      .createQueryBuilder('t')
      .select(['t.id AS id', 't.code AS code', 't.name AS name', 't.requiresExpiry AS requires_expiry'])
      .where('t.id IN (:...ids)', { ids: typeIds })
      .getRawMany<{ id: string; code: string; name: string; requires_expiry: boolean }>();
    const suppById = new Map(supps.map((s) => [s.id, s]));
    const typeById = new Map(types.map((t) => [t.id, t]));

    const out = items.map((c) => {
      const s = suppById.get(c.supplierId);
      const t = typeById.get(c.typeId);
      return {
        ...attachComputedStatus(c),
        supplier: s
          ? { id: s.id, ragioneSociale: s.ragione_sociale, partitaIva: s.partita_iva }
          : null,
        type: t
          ? { code: t.code, name: t.name, requiresExpiry: t.requires_expiry }
          : null,
      };
    });
    return { items: out, total, page: p, pageSize: ps };
  }
}

function attachComputedStatus(c: Certificate): Certificate {
  if (c.status === CertificateStatus.NO_EXPIRY || c.status === CertificateStatus.INVALID) return c;
  if (!c.dataScadenza) {
    c.status = CertificateStatus.NO_EXPIRY;
    return c;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(c.dataScadenza);
  exp.setHours(0, 0, 0, 0);
  const days = Math.floor((exp.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) c.status = CertificateStatus.EXPIRED;
  else if (days <= 7) c.status = CertificateStatus.EXPIRING_7;
  else if (days <= 30) c.status = CertificateStatus.EXPIRING_30;
  else if (days <= 60) c.status = CertificateStatus.EXPIRING_60;
  else c.status = CertificateStatus.VALID;
  return c;
}
