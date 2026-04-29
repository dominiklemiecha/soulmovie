import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoriesRenameRoots1700000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const map: Array<[string, string]> = [
      ['PT', 'PRODUZIONI, MARKETING E COMUNICAZIONE'],
      ['SG', 'SERVIZI GENERALI E FACILITY'],
      ['SB', 'SERVIZI PER IL BUSINESS'],
      ['ST', 'SISTEMI E TECNOLOGIE'],
      ['MG0000007453', 'Categoria Merceologica Checklist'],
      ['MG0000008003', 'Fornitori Spagna'],
    ];
    for (const [code, name] of map) {
      await queryRunner.query(
        `UPDATE "categories" SET "name" = $1, "updated_at" = now() WHERE "code" = $2`,
        [name, code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op: i nomi precedenti erano placeholder
  }
}
