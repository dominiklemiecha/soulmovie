import { MigrationInterface, QueryRunner } from 'typeorm';

export class CertificatesExtension1700000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "certificates"
        ADD COLUMN "nome_alternativo" text,
        ADD COLUMN "notify_emails" text[] NOT NULL DEFAULT '{}'
    `);
    await queryRunner.query(`
      INSERT INTO "certificate_types" ("code", "name", "requires_expiry") VALUES
        ('BILANCIO', 'Ultimo bilancio analitico', true),
        ('ATTRIB_PIVA', 'Attribuzione partita IVA', false),
        ('AUTOCERT_EST', 'Autocertificazione per persona fisica estera', false),
        ('TAX_CERT', 'Tax certification', true),
        ('CCIAA_VISURA', 'CCIAA Visura Camerale Società di Capitali e Persone', true),
        ('SS_ES', 'Certificado de Seguridad Social', true),
        ('FICHA_HOMOL', 'Ficha de Homologacion', true),
        ('DURF', 'DURF (solo società italiane)', true),
        ('CARD_ESG', 'Card ESG', true)
      ON CONFLICT (code) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "certificates"
        DROP COLUMN "notify_emails",
        DROP COLUMN "nome_alternativo"
    `);
  }
}
