import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT_DIRECT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'soulmovie_app',
  password: process.env.POSTGRES_PASSWORD ?? 'devpassword',
  database: process.env.POSTGRES_DB ?? 'soulmovie',
  entities: ['src/modules/**/entities/*.entity.ts'],
  migrations: ['migrations/*.ts'],
  synchronize: false,
  logging: ['error', 'warn'],
});
