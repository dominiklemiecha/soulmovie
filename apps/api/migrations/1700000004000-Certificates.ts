import { MigrationInterface, QueryRunner } from 'typeorm';

export class Certificates1700000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "certificate_types" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "requires_expiry" boolean NOT NULL DEFAULT true,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE TYPE "certificate_status_enum" AS ENUM ('valid','expiring_60','expiring_30','expiring_7','expired','no_expiry','invalid')`);

    await queryRunner.query(`
      CREATE TABLE "certificates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
        "type_id" uuid NOT NULL REFERENCES "certificate_types"("id") ON DELETE RESTRICT,
        "numero" text,
        "data_emissione" date,
        "data_scadenza" date,
        "emittente" text,
        "ambito" text,
        "descrizione" text,
        "document_object_key" text NOT NULL,
        "document_filename" text NOT NULL,
        "document_mime" text NOT NULL,
        "document_size" bigint NOT NULL,
        "last_notified_at" timestamptz,
        "notified_thresholds" int[] NOT NULL DEFAULT '{}',
        "status" "certificate_status_enum" NOT NULL DEFAULT 'valid',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "certificates_supplier_idx" ON "certificates" ("supplier_id", "data_scadenza")`,
    );
    await queryRunner.query(
      `CREATE INDEX "certificates_expiry_idx" ON "certificates" ("data_scadenza") WHERE "data_scadenza" IS NOT NULL`,
    );

    await queryRunner.query(`GRANT SELECT ON "certificate_types" TO admin_role, supplier_role`);
    await queryRunner.query(
      `GRANT INSERT, UPDATE, DELETE ON "certificate_types" TO admin_role`,
    );
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON "certificates" TO admin_role`,
    );
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON "certificates" TO supplier_role`,
    );

    await queryRunner.query(`ALTER TABLE "certificates" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "certificates_isolation" ON "certificates"
        FOR ALL TO supplier_role
        USING ("supplier_id" = current_setting('app.current_supplier_id', true)::uuid)
        WITH CHECK ("supplier_id" = current_setting('app.current_supplier_id', true)::uuid)
    `);

    // Seed tipologie comuni
    await queryRunner.query(`
      INSERT INTO "certificate_types" ("code", "name", "requires_expiry") VALUES
        ('VISURA', 'Visura camerale', true),
        ('DURC', 'DURC', true),
        ('ISO9001', 'ISO 9001 — Qualità', true),
        ('ISO14001', 'ISO 14001 — Ambiente', true),
        ('ISO45001', 'ISO 45001 — Salute e sicurezza', true),
        ('CASELLARIO', 'Certificato casellario giudiziale', true),
        ('ANTIMAFIA', 'Certificato antimafia', true),
        ('SACCREDITAMENTO', 'S accreditamento volontario per partecipazione a gara', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "certificates_isolation" ON "certificates"`);
    await queryRunner.query(`DROP TABLE "certificates"`);
    await queryRunner.query(`DROP TYPE "certificate_status_enum"`);
    await queryRunner.query(`DROP TABLE "certificate_types"`);
  }
}
