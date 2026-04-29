import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { CertificateStatus } from '@soulmovie/shared';

@Entity('certificates')
@Index(['supplierId', 'dataScadenza'])
export class Certificate {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'supplier_id', type: 'uuid' }) supplierId!: string;
  @Column({ name: 'type_id', type: 'uuid' }) typeId!: string;
  @Column({ type: 'text', nullable: true }) numero?: string | null;
  @Column({ name: 'nome_alternativo', type: 'text', nullable: true })
  nomeAlternativo?: string | null;
  @Column({ name: 'notify_emails', type: 'text', array: true, default: () => "'{}'" })
  notifyEmails!: string[];
  @Column({ name: 'data_emissione', type: 'date', nullable: true })
  dataEmissione?: string | null;
  @Column({ name: 'data_scadenza', type: 'date', nullable: true })
  dataScadenza?: string | null;
  @Column({ type: 'text', nullable: true }) emittente?: string | null;
  @Column({ type: 'text', nullable: true }) ambito?: string | null;
  @Column({ type: 'text', nullable: true }) descrizione?: string | null;
  @Column({ name: 'document_object_key', type: 'text' }) documentObjectKey!: string;
  @Column({ name: 'document_filename', type: 'text' }) documentFilename!: string;
  @Column({ name: 'document_mime', type: 'text' }) documentMime!: string;
  @Column({ name: 'document_size', type: 'bigint' }) documentSize!: string;
  @Column({ name: 'last_notified_at', type: 'timestamptz', nullable: true })
  lastNotifiedAt?: Date | null;
  @Column({ name: 'notified_thresholds', type: 'int', array: true, default: () => "'{}'" })
  notifiedThresholds!: number[];
  @Column({ type: 'enum', enum: CertificateStatus, default: CertificateStatus.VALID })
  status!: CertificateStatus;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
