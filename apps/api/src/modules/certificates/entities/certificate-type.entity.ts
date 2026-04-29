import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('certificate_types')
export class CertificateType {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'text', unique: true }) code!: string;
  @Column({ type: 'text' }) name!: string;
  @Column({ name: 'requires_expiry', type: 'boolean', default: true })
  requiresExpiry!: boolean;
  @Column({ type: 'boolean', default: true }) active!: boolean;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
