import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type OneTimeTokenPurpose = 'password_reset' | 'email_verification' | 'invite';

@Entity('one_time_tokens')
export class OneTimeToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'text' }) tokenHash!: string;
  @Column({ type: 'text' }) purpose!: OneTimeTokenPurpose;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true }) usedAt?: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
