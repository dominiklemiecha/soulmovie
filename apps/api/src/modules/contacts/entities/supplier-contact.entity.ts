import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('supplier_contacts')
@Index(['supplierId'])
export class SupplierContact {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'supplier_id', type: 'uuid' }) supplierId!: string;
  @Column({ type: 'text' }) nome!: string;
  @Column({ type: 'text' }) cognome!: string;
  @Column({ type: 'text', nullable: true }) ruolo?: string | null;
  @Column({ type: 'text', nullable: true }) email?: string | null;
  @Column({ type: 'text', nullable: true }) telefono?: string | null;
  @Column({ type: 'text', nullable: true }) cellulare?: string | null;
  @Column({ name: 'is_main', type: 'boolean', default: false }) isMain!: boolean;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
