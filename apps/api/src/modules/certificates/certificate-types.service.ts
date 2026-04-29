import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CertificateTypeCreateDto,
  CertificateTypeUpdateDto,
  ErrorCodes,
} from '@soulmovie/shared';
import { CertificateType } from './entities/certificate-type.entity';
import { Certificate } from './entities/certificate.entity';

@Injectable()
export class CertificateTypesService {
  constructor(private readonly ds: DataSource) {}

  list(includeInactive = false) {
    return this.ds
      .getRepository(CertificateType)
      .find(includeInactive ? { order: { name: 'ASC' } } : { where: { active: true }, order: { name: 'ASC' } });
  }

  async create(dto: CertificateTypeCreateDto): Promise<CertificateType> {
    const repo = this.ds.getRepository(CertificateType);
    const exists = await repo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException({
        error: { code: ErrorCodes.CERT_TYPE_CODE_DUPLICATE, message: 'Codice già usato' },
      });
    }
    return repo.save(repo.create(dto));
  }

  async update(id: string, dto: CertificateTypeUpdateDto): Promise<CertificateType> {
    const repo = this.ds.getRepository(CertificateType);
    const cur = await repo.findOne({ where: { id } });
    if (!cur) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Tipologia non trovata' },
      });
    }
    Object.assign(cur, dto, { updatedAt: new Date() });
    return repo.save(cur);
  }

  async remove(id: string): Promise<void> {
    const used = await this.ds.getRepository(Certificate).count({ where: { typeId: id } });
    if (used > 0) {
      throw new ConflictException({
        error: {
          code: ErrorCodes.CERT_TYPE_IN_USE,
          message: `Tipologia in uso da ${used} certificati`,
        },
      });
    }
    const r = await this.ds.getRepository(CertificateType).delete({ id });
    if (!r.affected) {
      throw new NotFoundException({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Tipologia non trovata' },
      });
    }
  }
}
