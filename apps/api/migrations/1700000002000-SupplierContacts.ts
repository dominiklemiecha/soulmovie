import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupplierContacts1700000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "supplier_contacts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
        "nome" text NOT NULL,
        "cognome" text NOT NULL,
        "ruolo" text,
        "email" text,
        "telefono" text,
        "cellulare" text,
        "is_main" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "supplier_contacts_supplier_idx" ON "supplier_contacts" ("supplier_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "supplier_contacts_main_unique" ON "supplier_contacts" ("supplier_id") WHERE "is_main" = true`,
    );
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "supplier_contacts" TO admin_role`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "supplier_contacts" TO supplier_role`);
    await queryRunner.query(`ALTER TABLE "supplier_contacts" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "supplier_contacts_isolation" ON "supplier_contacts"
        FOR ALL TO supplier_role
        USING ("supplier_id" = current_setting('app.current_supplier_id', true)::uuid)
        WITH CHECK ("supplier_id" = current_setting('app.current_supplier_id', true)::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS "supplier_contacts_isolation" ON "supplier_contacts"`);
    await queryRunner.query(`DROP TABLE "supplier_contacts"`);
  }
}
