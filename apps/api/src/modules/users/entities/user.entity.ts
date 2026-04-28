import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role, UserStatus } from '@soulmovie/shared';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true })
  @Column({ type: 'citext' }) email!: string;
  @Column({ name: 'password_hash', type: 'text' }) passwordHash!: string;
  @Column({ type: 'enum', enum: Role }) role!: Role;
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING_EMAIL }) status!: UserStatus;
  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true }) emailVerifiedAt?: Date | null;
  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier | null;
  @Column({ name: 'supplier_id', type: 'uuid', nullable: true }) supplierId?: string | null;
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true }) lastLoginAt?: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
