import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_log')
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId?: string | null;
  @Column({ name: 'supplier_id', type: 'uuid', nullable: true }) supplierId?: string | null;
  @Column({ type: 'text' }) action!: string;
  @Column({ name: 'entity_type', type: 'text' }) entityType!: string;
  @Column({ name: 'entity_id', type: 'uuid', nullable: true }) entityId?: string | null;
  @Column({ type: 'jsonb', nullable: true }) before?: object | null;
  @Column({ type: 'jsonb', nullable: true }) after?: object | null;
  @Column({ type: 'inet', nullable: true }) ip?: string | null;
  @Column({ name: 'user_agent', type: 'text', nullable: true }) userAgent?: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
