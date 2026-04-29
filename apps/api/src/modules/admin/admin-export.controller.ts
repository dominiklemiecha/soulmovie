import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { DataSource, In } from 'typeorm';
import { ApprovalStatus, Role } from '@soulmovie/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { CertificateType } from '../certificates/entities/certificate-type.entity';
import { User } from '../users/entities/user.entity';

@Controller('admin/export')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminExportController {
  constructor(private readonly ds: DataSource) {}

  @Get('suppliers.csv')
  async suppliersCsv(@Res() res: Response, @Query('status') status?: string, @Query('q') q?: string) {
    const qb = this.ds.getRepository(Supplier).createQueryBuilder('s').orderBy('s.createdAt', 'DESC');
    if (
      status &&
      [ApprovalStatus.PENDING, ApprovalStatus.APPROVED, ApprovalStatus.REJECTED].includes(
        status as ApprovalStatus,
      )
    ) {
      qb.andWhere('s.approvalStatus = :st', { st: status });
    }
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      qb.andWhere(
        '(s.ragioneSociale ILIKE :like OR s.partitaIva ILIKE :like OR s.codiceFiscale ILIKE :like OR s.citta ILIKE :like)',
        { like },
      );
    }
    const suppliers = await qb.getMany();
    const userIds = await this.ds
      .getRepository(User)
      .createQueryBuilder('u')
      .select(['u.email AS email', 'u.supplierId AS supplier_id'])
      .where('u.supplierId IN (:...ids)', { ids: suppliers.map((s) => s.id).concat('00000000-0000-0000-0000-000000000000') })
      .getRawMany<{ email: string; supplier_id: string }>();
    const emailBy = new Map(userIds.map((u) => [u.supplier_id, u.email]));

    const headers = [
      'Ragione sociale',
      'Email login',
      'P.IVA',
      'Codice fiscale',
      'Stato',
      'Origine',
      'Indirizzo',
      'CAP',
      'Città',
      'Provincia',
      'Paese',
      'Email aziendale',
      'PEC',
      'Telefono',
      'IBAN',
      'Creato il',
    ];
    const rows = suppliers.map((s) => [
      s.ragioneSociale,
      emailBy.get(s.id) ?? '',
      s.partitaIva ?? '',
      s.codiceFiscale ?? '',
      s.approvalStatus,
      s.registrationSource,
      s.indirizzo ?? '',
      s.cap ?? '',
      s.citta ?? '',
      s.provincia ?? '',
      s.paese,
      s.emailAziendale ?? '',
      s.pec ?? '',
      s.telefono ?? '',
      s.iban ?? '',
      s.createdAt.toISOString().slice(0, 10),
    ]);
    sendCsv(res, 'fornitori.csv', headers, rows);
  }

  @Get('certificates.csv')
  async certsCsv(@Res() res: Response, @Query('window') window?: string, @Query('q') q?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isoToday = today.toISOString().slice(0, 10);
    const plus = (d: number) => {
      const x = new Date(today);
      x.setDate(x.getDate() + d);
      return x.toISOString().slice(0, 10);
    };
    const qb = this.ds
      .getRepository(Certificate)
      .createQueryBuilder('c')
      .orderBy('c.dataScadenza', 'ASC');
    if (window === 'expired') qb.andWhere('c.dataScadenza < :today', { today: isoToday });
    else if (window === '7')
      qb.andWhere('c.dataScadenza BETWEEN :today AND :end', { today: isoToday, end: plus(7) });
    else if (window === '30')
      qb.andWhere('c.dataScadenza BETWEEN :today AND :end', { today: isoToday, end: plus(30) });
    else if (window === '60')
      qb.andWhere('c.dataScadenza BETWEEN :today AND :end', { today: isoToday, end: plus(60) });
    const items = await qb.getMany();
    if (items.length === 0) {
      return sendCsv(res, 'certificati.csv', ['Fornitore', 'Tipologia', 'Scadenza'], []);
    }
    const supps = await this.ds
      .getRepository(Supplier)
      .find({ where: { id: In(items.map((i) => i.supplierId)) }, select: ['id', 'ragioneSociale', 'partitaIva'] });
    const types = await this.ds
      .getRepository(CertificateType)
      .find({ where: { id: In(items.map((i) => i.typeId)) }, select: ['id', 'code', 'name'] });
    const sBy = new Map(supps.map((s) => [s.id, s]));
    const tBy = new Map(types.map((t) => [t.id, t]));
    const headers = [
      'Fornitore',
      'P.IVA',
      'Tipologia',
      'Codice tipologia',
      'Numero/etichetta',
      'Emissione',
      'Scadenza',
      'Autorità',
      'Email notifica',
      'File',
    ];
    const rows = items.map((c) => {
      const s = sBy.get(c.supplierId);
      const t = tBy.get(c.typeId);
      return [
        s?.ragioneSociale ?? '',
        s?.partitaIva ?? '',
        t?.name ?? '',
        t?.code ?? '',
        c.nomeAlternativo ?? c.numero ?? '',
        c.dataEmissione ?? '',
        c.dataScadenza ?? '',
        c.emittente ?? '',
        (c.notifyEmails ?? []).join('; '),
        c.documentFilename,
      ];
    });
    sendCsv(res, 'certificati.csv', headers, rows);
  }
}

function sendCsv(res: Response, filename: string, headers: string[], rows: any[][]) {
  const escape = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes(';')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  // BOM per Excel UTF-8
  const body = '﻿' + csv;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
}
