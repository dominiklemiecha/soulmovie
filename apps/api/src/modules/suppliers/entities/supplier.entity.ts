import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ApprovalStatus, Gender, LegalNature, RegistrationSource } from '@soulmovie/shared';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'is_persona_fisica', type: 'boolean', default: false })
  isPersonaFisica!: boolean;
  @Column({ name: 'ragione_sociale', type: 'text' }) ragioneSociale!: string;
  @Column({ type: 'text', nullable: true }) nome?: string | null;
  @Column({ type: 'enum', enum: Gender, nullable: true }) sesso?: Gender | null;
  @Column({ name: 'paese_nascita', type: 'text', nullable: true })
  paeseNascita?: string | null;
  @Column({ name: 'provincia_nascita', type: 'text', nullable: true })
  provinciaNascita?: string | null;
  @Column({ name: 'citta_nascita', type: 'text', nullable: true })
  cittaNascita?: string | null;
  @Column({ name: 'data_nascita', type: 'date', nullable: true })
  dataNascita?: string | null;

  @Column({ type: 'text', default: 'IT' }) paese!: string;
  @Column({ type: 'text', nullable: true }) indirizzo?: string | null;
  @Column({ type: 'text', nullable: true }) cap?: string | null;
  @Column({ type: 'text', nullable: true }) citta?: string | null;
  @Column({ type: 'text', nullable: true }) provincia?: string | null;

  @Column({ name: 'sito_web', type: 'text', nullable: true }) sitoWeb?: string | null;
  @Column({ name: 'email_aziendale', type: 'text', nullable: true })
  emailAziendale?: string | null;
  @Column({ type: 'text', nullable: true }) pec?: string | null;
  @Column({ type: 'text', nullable: true }) telefono?: string | null;

  @Column({ name: 'natura_giuridica', type: 'enum', enum: LegalNature, nullable: true })
  naturaGiuridica?: LegalNature | null;
  @Column({ name: 'vies_registered', type: 'boolean', default: false })
  viesRegistered!: boolean;
  @Index({ unique: true, where: '"codice_fiscale" IS NOT NULL' })
  @Column({ name: 'codice_fiscale', type: 'text', nullable: true })
  codiceFiscale?: string | null;
  @Index({ unique: true, where: '"partita_iva" IS NOT NULL' })
  @Column({ name: 'partita_iva', type: 'text', nullable: true })
  partitaIva?: string | null;
  @Column({ name: 'partita_iva_extra_ue', type: 'text', nullable: true })
  partitaIvaExtraUe?: string | null;
  @Column({ type: 'text', nullable: true }) iban?: string | null;
  @Column({ type: 'text', default: 'EUR' }) valuta!: string;
  @Column({ name: 'gruppo_iva', type: 'text', nullable: true }) gruppoIva?: string | null;

  @Column({ name: 'registration_source', type: 'enum', enum: RegistrationSource })
  registrationSource!: RegistrationSource;
  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus!: ApprovalStatus;
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;
  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;
}
