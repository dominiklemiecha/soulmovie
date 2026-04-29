import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from './entities/certificate.entity';
import { CertificateType } from './entities/certificate-type.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { CertificatesService } from './certificates.service';
import { CertificateTypesService } from './certificate-types.service';
import { CertificatesController } from './certificates.controller';
import { AdminCertificateTypesController } from './admin-certificate-types.controller';
import { PublicCertificateTypesController } from './public-certificate-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, CertificateType, OutboxEvent, AuditLog])],
  controllers: [
    CertificatesController,
    AdminCertificateTypesController,
    PublicCertificateTypesController,
  ],
  providers: [CertificatesService, CertificateTypesService],
})
export class CertificatesModule {}
