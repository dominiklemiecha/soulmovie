import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories')
@Index(['parentId', 'orderIndex'])
export class Category {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'text', unique: true }) code!: string;
  @Column({ type: 'text' }) name!: string;
  @Column({ name: 'parent_id', type: 'uuid', nullable: true }) parentId?: string | null;
  @Column({ type: 'boolean', default: true }) active!: boolean;
  @Column({ name: 'order_index', type: 'int', default: 0 }) orderIndex!: number;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
