import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

const isProd = __filename.endsWith('.js');
// In dev (.ts via ts-node): cwd è apps/api; in prod (compilato): __dirname è apps/api/dist/src/infra/typeorm
const apiRoot = isProd
  ? path.resolve(__dirname, '../../../../..') // → /app/apps/api
  : path.resolve(__dirname, '../../..');       // → apps/api

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT_DIRECT ?? process.env.DB_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'soulmovie_app',
  password: process.env.POSTGRES_PASSWORD ?? 'devpassword',
  database: process.env.POSTGRES_DB ?? 'soulmovie',
  entities: isProd
    ? [path.join(apiRoot, 'dist/src/modules/**/entities/*.entity.js')]
    : ['src/modules/**/entities/*.entity.ts'],
  migrations: isProd
    ? [path.join(apiRoot, 'dist/migrations/*.js')]
    : ['migrations/*.ts'],
  synchronize: false,
  logging: ['error', 'warn'],
});
