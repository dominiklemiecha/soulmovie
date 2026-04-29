import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

const isProd = __filename.endsWith('.js');
// In prod __dirname = /app/apps/api/dist/src/infra/typeorm → 4 livelli su = /app/apps/api
const apiRoot = isProd
  ? path.resolve(__dirname, '../../../..')
  : path.resolve(__dirname, '../../..');

const migrationsGlob = isProd
  ? path.join(apiRoot, 'dist', 'migrations', '*.js')
  : 'migrations/*.ts';
const entitiesGlob = isProd
  ? path.join(apiRoot, 'dist', 'src', 'modules', '**', 'entities', '*.entity.js')
  : 'src/modules/**/entities/*.entity.ts';

// eslint-disable-next-line no-console
console.log('[data-source]', { isProd, apiRoot, migrationsGlob, entitiesGlob });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT_DIRECT ?? process.env.DB_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'soulmovie_app',
  password: process.env.POSTGRES_PASSWORD ?? 'devpassword',
  database: process.env.POSTGRES_DB ?? 'soulmovie',
  entities: [entitiesGlob],
  migrations: [migrationsGlob],
  synchronize: false,
  logging: ['error', 'warn'],
});
