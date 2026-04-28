import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'text' }) tokenHash!: string;
  @Column({ name: 'family_id', type: 'uuid' }) familyId!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true }) usedAt?: Date | null;
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt?: Date | null;
  @Column({ type: 'inet', nullable: true }) ip?: string | null;
  @Column({ name: 'user_agent', type: 'text', nullable: true }) userAgent?: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
