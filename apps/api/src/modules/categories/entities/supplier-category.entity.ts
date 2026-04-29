import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('supplier_categories')
export class SupplierCategory {
  @PrimaryColumn({ name: 'supplier_id', type: 'uuid' }) supplierId!: string;
  @PrimaryColumn({ name: 'category_id', type: 'uuid' }) categoryId!: string;
  @Column({ name: 'include_subelements', type: 'boolean', default: true })
  includeSubelements!: boolean;
  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'now()' })
  assignedAt!: Date;
}
