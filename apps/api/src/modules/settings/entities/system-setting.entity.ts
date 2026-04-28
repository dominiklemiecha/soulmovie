import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ type: 'text' }) key!: string;
  @Column({ name: 'value_encrypted', type: 'bytea' }) valueEncrypted!: Buffer;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy?: string | null;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
