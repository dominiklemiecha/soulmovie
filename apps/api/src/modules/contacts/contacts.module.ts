import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierContact } from './entities/supplier-contact.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierContact, OutboxEvent, AuditLog])],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
