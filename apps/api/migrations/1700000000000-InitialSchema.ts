import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "role_enum" AS ENUM ('admin','supplier')`);
    await queryRunner.query(`CREATE TYPE "user_status_enum" AS ENUM ('invited','pending_email','active','disabled')`);
    await queryRunner.query(`CREATE TYPE "approval_status_enum" AS ENUM ('pending','approved','rejected')`);
    await queryRunner.query(`CREATE TYPE "registration_source_enum" AS ENUM ('self','invite')`);

    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ragione_sociale" text NOT NULL,
        "paese" text NOT NULL DEFAULT 'IT',
        "indirizzo" text, "cap" text, "citta" text, "provincia" text,
        "sito_web" text, "email_aziendale" text, "pec" text, "telefono" text,
        "natura_giuridica" text,
        "codice_fiscale" text,
        "partita_iva" text,
        "iban" text, "valuta" text NOT NULL DEFAULT 'EUR', "gruppo_iva" text,
        "registration_source" "registration_source_enum" NOT NULL,
        "approval_status" "approval_status_enum" NOT NULL DEFAULT 'pending',
        "approved_at" timestamptz, "approved_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "suppliers_codice_fiscale_unique" ON "suppliers"("codice_fiscale") WHERE "codice_fiscale" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "suppliers_partita_iva_unique" ON "suppliers"("partita_iva") WHERE "partita_iva" IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" citext NOT NULL,
        "password_hash" text NOT NULL,
        "role" "role_enum" NOT NULL,
        "status" "user_status_enum" NOT NULL DEFAULT 'pending_email',
        "email_verified_at" timestamptz,
        "supplier_id" uuid REFERENCES "suppliers"("id") ON DELETE CASCADE,
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "users_email_unique" ON "users"("email")`);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" text NOT NULL UNIQUE,
        "family_id" uuid NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz, "revoked_at" timestamptz,
        "ip" inet, "user_agent" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "one_time_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" text NOT NULL UNIQUE,
        "purpose" text NOT NULL CHECK ("purpose" IN ('password_reset','email_verification','invite')),
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "system_settings" (
        "key" text PRIMARY KEY,
        "value_encrypted" bytea NOT NULL,
        "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "supplier_id" uuid,
        "action" text NOT NULL,
        "entity_type" text NOT NULL,
        "entity_id" uuid,
        "before" jsonb, "after" jsonb,
        "ip" inet, "user_agent" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "audit_log_entity_idx" ON "audit_log"("entity_type","entity_id","created_at")`);
    await queryRunner.query(`CREATE INDEX "audit_log_user_idx" ON "audit_log"("user_id","created_at")`);

    await queryRunner.query(`
      CREATE TABLE "outbox_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "aggregate_type" text NOT NULL,
        "aggregate_id" uuid NOT NULL,
        "event_type" text NOT NULL,
        "payload" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "processed_at" timestamptz
      )
    `);
    await queryRunner.query(`CREATE INDEX "outbox_unprocessed_idx" ON "outbox_events"("processed_at","created_at") WHERE "processed_at" IS NULL`);

    // Permessi sui ruoli applicativi
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admin_role`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO supplier_role`);
    await queryRunner.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO admin_role, supplier_role`);

    // RLS sulla tabella suppliers
    await queryRunner.query(`ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "supplier_self_isolation" ON "suppliers"
        FOR ALL TO supplier_role
        USING ("id" = current_setting('app.current_supplier_id', true)::uuid)
        WITH CHECK ("id" = current_setting('app.current_supplier_id', true)::uuid)
    `);

    // audit_log RLS
    await queryRunner.query(`ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`CREATE POLICY "audit_log_insert_only" ON "audit_log" FOR INSERT TO supplier_role WITH CHECK (true)`);
    await queryRunner.query(`
      CREATE POLICY "audit_log_select_self" ON "audit_log"
        FOR SELECT TO supplier_role
        USING ("supplier_id" = current_setting('app.current_supplier_id', true)::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "outbox_events" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "one_time_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "registration_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "approval_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "role_enum"`);
  }
}
