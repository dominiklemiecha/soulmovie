import { MigrationInterface, QueryRunner } from 'typeorm';

export class Categories1700000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "parent_id" uuid REFERENCES "categories"("id") ON DELETE RESTRICT,
        "active" boolean NOT NULL DEFAULT true,
        "order_index" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "categories_parent_idx" ON "categories" ("parent_id", "order_index")`,
    );

    await queryRunner.query(`
      CREATE TABLE "supplier_categories" (
        "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
        "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT,
        "include_subelements" boolean NOT NULL DEFAULT true,
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("supplier_id", "category_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "supplier_categories_cat_idx" ON "supplier_categories" ("category_id")`,
    );

    await queryRunner.query(`GRANT SELECT ON "categories" TO admin_role, supplier_role`);
    await queryRunner.query(`GRANT INSERT, UPDATE, DELETE ON "categories" TO admin_role`);
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON "supplier_categories" TO admin_role`,
    );
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON "supplier_categories" TO supplier_role`,
    );

    await queryRunner.query(`ALTER TABLE "supplier_categories" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "supplier_categories_isolation" ON "supplier_categories"
        FOR ALL TO supplier_role
        USING ("supplier_id" = current_setting('app.current_supplier_id', true)::uuid)
        WITH CHECK ("supplier_id" = current_setting('app.current_supplier_id', true)::uuid)
    `);

    // Seed 6 categorie root Mediaset + alcuni esempi
    await queryRunner.query(`
      INSERT INTO "categories" ("code", "name", "order_index") VALUES
        ('PT', 'Produzioni TV', 1),
        ('SG', 'Servizi Generali', 2),
        ('SB', 'Servizi Broadcast', 3),
        ('ST', 'Servizi Tecnici', 4),
        ('MG0000007453', 'Materiali generici 1', 5),
        ('MG0000008003', 'Materiali generici 2', 6)
    `);
    await queryRunner.query(`
      INSERT INTO "categories" ("code", "name", "parent_id", "order_index")
      SELECT 'SVID000093', 'Tecnico generico', id, 1 FROM "categories" WHERE code='ST'
    `);
    await queryRunner.query(`
      INSERT INTO "categories" ("code", "name", "parent_id", "order_index")
      SELECT 'SENG000087', 'Ingegneria — gestionale', id, 2 FROM "categories" WHERE code='ST'
    `);
    await queryRunner.query(`
      INSERT INTO "categories" ("code", "name", "parent_id", "order_index")
      SELECT 'SSTU000077', 'Studi e ricerche', id, 3 FROM "categories" WHERE code='ST'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS "supplier_categories_isolation" ON "supplier_categories"`,
    );
    await queryRunner.query(`DROP TABLE "supplier_categories"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
