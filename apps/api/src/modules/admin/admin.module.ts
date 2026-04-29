import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';
import { MailModule } from '../../infra/mail/mail.module';
import { AdminSuppliersController } from './admin-suppliers.controller';
import { AdminSuppliersService } from './admin-suppliers.service';
import {
  AdminCertificatesController,
  AdminSupplierDetailController,
} from './admin-supplier-detail.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminExportController } from './admin-export.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { SettingsModule } from '../settings/settings.module';
import { SupplierContact } from '../contacts/entities/supplier-contact.entity';
import { SupplierCategory } from '../categories/entities/supplier-category.entity';
import { Category } from '../categories/entities/category.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { CertificateType } from '../certificates/entities/certificate-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      User,
      AuditLog,
      OutboxEvent,
      SupplierContact,
      SupplierCategory,
      Category,
      Certificate,
      CertificateType,
    ]),
    MailModule,
    SettingsModule,
  ],
  controllers: [
    AdminSuppliersController,
    AdminSupplierDetailController,
    AdminCertificatesController,
    AdminAuditController,
    AdminExportController,
    AdminSettingsController,
  ],
  providers: [AdminSuppliersService],
})
export class AdminModule {}
