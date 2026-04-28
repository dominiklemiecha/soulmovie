import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ApprovalStatus, RegistrationSource } from '@soulmovie/shared';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'ragione_sociale', type: 'text' }) ragioneSociale!: string;
  @Column({ type: 'text', default: 'IT' }) paese!: string;
  @Column({ type: 'text', nullable: true }) indirizzo?: string;
  @Column({ type: 'text', nullable: true }) cap?: string;
  @Column({ type: 'text', nullable: true }) citta?: string;
  @Column({ type: 'text', nullable: true }) provincia?: string;
  @Column({ name: 'sito_web', type: 'text', nullable: true }) sitoWeb?: string;
  @Column({ name: 'email_aziendale', type: 'text', nullable: true }) emailAziendale?: string;
  @Column({ type: 'text', nullable: true }) pec?: string;
  @Column({ type: 'text', nullable: true }) telefono?: string;
  @Column({ name: 'natura_giuridica', type: 'text', nullable: true }) naturaGiuridica?: string;
  @Index({ unique: true, where: '"codice_fiscale" IS NOT NULL' })
  @Column({ name: 'codice_fiscale', type: 'text', nullable: true }) codiceFiscale?: string | null;
  @Index({ unique: true, where: '"partita_iva" IS NOT NULL' })
  @Column({ name: 'partita_iva', type: 'text', nullable: true }) partitaIva?: string | null;
  @Column({ type: 'text', nullable: true }) iban?: string;
  @Column({ type: 'text', default: 'EUR' }) valuta!: string;
  @Column({ name: 'gruppo_iva', type: 'text', nullable: true }) gruppoIva?: string;
  @Column({ name: 'registration_source', type: 'enum', enum: RegistrationSource }) registrationSource!: RegistrationSource;
  @Column({ name: 'approval_status', type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING }) approvalStatus!: ApprovalStatus;
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true }) approvedAt?: Date | null;
  @Column({ name: 'approved_by', type: 'uuid', nullable: true }) approvedBy?: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
