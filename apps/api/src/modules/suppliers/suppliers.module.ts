import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, OutboxEvent, AuditLog])],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
