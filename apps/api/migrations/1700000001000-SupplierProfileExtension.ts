import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupplierProfileExtension1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "legal_nature_enum" AS ENUM ('corporation','partnership','natural_person','other')`);
    await queryRunner.query(`CREATE TYPE "gender_enum" AS ENUM ('M','F')`);
    await queryRunner.query(`
      ALTER TABLE "suppliers"
        ALTER COLUMN "natura_giuridica" DROP DEFAULT,
        ALTER COLUMN "natura_giuridica" TYPE "legal_nature_enum"
          USING (CASE
            WHEN "natura_giuridica" IS NULL THEN NULL
            WHEN lower("natura_giuridica") IN ('corporation','società di capitali','societa di capitali','srl','spa','sapa') THEN 'corporation'::legal_nature_enum
            WHEN lower("natura_giuridica") IN ('partnership','società di persone','societa di persone','snc','sas','ss') THEN 'partnership'::legal_nature_enum
            ELSE 'other'::legal_nature_enum
          END),
        ADD COLUMN "is_persona_fisica" boolean NOT NULL DEFAULT false,
        ADD COLUMN "nome" text,
        ADD COLUMN "sesso" "gender_enum",
        ADD COLUMN "paese_nascita" text,
        ADD COLUMN "provincia_nascita" text,
        ADD COLUMN "citta_nascita" text,
        ADD COLUMN "data_nascita" date,
        ADD COLUMN "vies_registered" boolean NOT NULL DEFAULT false,
        ADD COLUMN "partita_iva_extra_ue" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "suppliers"
        DROP COLUMN "partita_iva_extra_ue",
        DROP COLUMN "vies_registered",
        DROP COLUMN "data_nascita",
        DROP COLUMN "citta_nascita",
        DROP COLUMN "provincia_nascita",
        DROP COLUMN "paese_nascita",
        DROP COLUMN "sesso",
        DROP COLUMN "nome",
        DROP COLUMN "is_persona_fisica",
        ALTER COLUMN "natura_giuridica" TYPE text USING "natura_giuridica"::text
    `);
    await queryRunner.query(`DROP TYPE "gender_enum"`);
    await queryRunner.query(`DROP TYPE "legal_nature_enum"`);
  }
}
