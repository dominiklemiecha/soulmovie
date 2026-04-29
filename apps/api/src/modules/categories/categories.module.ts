import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { SupplierCategory } from './entities/supplier-category.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { CategoriesService } from './categories.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { SupplierCategoriesController } from './supplier-categories.controller';
import { PublicCategoriesController } from './public-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, SupplierCategory, OutboxEvent, AuditLog])],
  controllers: [
    AdminCategoriesController,
    SupplierCategoriesController,
    PublicCategoriesController,
  ],
  providers: [CategoriesService],
})
export class CategoriesModule {}
