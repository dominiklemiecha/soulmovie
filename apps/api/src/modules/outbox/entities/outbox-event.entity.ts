import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('outbox_events')
@Index(['processedAt', 'createdAt'])
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'aggregate_type', type: 'text' }) aggregateType!: string;
  @Column({ name: 'aggregate_id', type: 'uuid' }) aggregateId!: string;
  @Column({ name: 'event_type', type: 'text' }) eventType!: string;
  @Column({ type: 'jsonb' }) payload!: object;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true }) processedAt?: Date | null;
}
