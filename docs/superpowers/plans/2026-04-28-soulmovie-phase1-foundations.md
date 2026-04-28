# Soulmovie — Fase 1: Fondamenta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire l'ossatura completa del progetto soulmovie (monorepo + stack docker + DB con RLS + autenticazione completa + shell frontend) così da avere un'app funzionante in cui un admin può fare login e un fornitore può registrarsi/essere invitato e accedere a una dashboard vuota.

**Architecture:** Monorepo pnpm con `apps/web` (React+Vite), `apps/api` (NestJS) e `packages/shared` (zod schemas + DTO). Stack di sviluppo via `docker compose` (postgres, pgbouncer, redis, elastic, minio, mailhog). Database con due ruoli `admin_role`/`supplier_role` e RLS attiva su tabelle supplier-owned; NestJS imposta `SET LOCAL app.current_supplier_id` per richiesta. JWT access (15min, body) + refresh (7gg, cookie httpOnly) con rotation+detection riuso. Settings (SMTP) cifrate AES-256-GCM e modificabili a runtime.

**Tech Stack:** pnpm 9, Node 20, TypeScript 5, NestJS 10, TypeORM 0.3, Postgres 16, PgBouncer (transaction mode), Redis 7, Elasticsearch 8, MinIO, MailHog (dev SMTP), Vite 5, React 18, TanStack Router, TanStack Query, react-hook-form, zod, shadcn/ui, Tailwind 3, argon2, jsonwebtoken, BullMQ.

**Spec di riferimento:** `docs/superpowers/specs/2026-04-28-soulmovie-dashboard-design.md`

**Prerequisito ambiente:** Node 20, pnpm 9, Docker Desktop installati. Repo `git init` (se non già fatto).

---

## File Structure

Mappa dei file creati/modificati durante questa fase:

### Root
- `package.json` — script orchestrazione monorepo
- `pnpm-workspace.yaml` — definizione workspaces
- `tsconfig.base.json` — config TS condivisa
- `.gitignore`, `.editorconfig`, `.nvmrc`
- `.env.example` — env vars documentate
- `README.md` — istruzioni dev

### `infra/`
- `docker-compose.yml` — stack dev completo (8 servizi + mailhog)
- `pgbouncer/pgbouncer.ini`, `pgbouncer/userlist.txt.template`
- `postgres/init/01-extensions.sql` — `citext`, `pgcrypto`
- `postgres/init/02-roles.sql` — crea `admin_role`, `supplier_role`, `soulmovie_app`

### `packages/shared/`
- `package.json`, `tsconfig.json`
- `src/index.ts` — barrel export
- `src/enums.ts` — `Role`, `UserStatus`, `ApprovalStatus`, `RegistrationSource`
- `src/error-codes.ts` — codici errore machine-readable
- `src/schemas/auth.ts` — zod schemas per auth (register/login/refresh/reset)
- `src/schemas/common.ts` — schemas condivisi (UUID, email, ecc.)

### `apps/api/`
- `package.json`, `tsconfig.json`, `nest-cli.json`, `.eslintrc.cjs`
- `Dockerfile`, `.dockerignore`
- `src/main.ts` — entrypoint API
- `src/worker.ts` — entrypoint worker
- `src/app.module.ts`
- `src/config/configuration.ts` — env loader
- `src/infra/typeorm/data-source.ts` — DataSource per CLI migrations
- `src/infra/typeorm/typeorm.module.ts` — modulo NestJS
- `src/infra/redis/redis.module.ts`
- `src/infra/mail/mail.module.ts`, `mail.service.ts` — nodemailer + system_settings
- `src/infra/crypto/crypto.service.ts` — AES-256-GCM
- `src/common/interceptors/request-context.interceptor.ts` — `SET LOCAL` per RLS
- `src/common/interceptors/audit.interceptor.ts`
- `src/common/filters/all-exceptions.filter.ts` — formato errore uniforme
- `src/common/guards/jwt-auth.guard.ts`, `roles.guard.ts`
- `src/common/decorators/current-user.decorator.ts`, `roles.decorator.ts`, `public.decorator.ts`
- `src/modules/auth/` — controller, service, dto, strategies, tokens.service
- `src/modules/users/` — entity, repository, service
- `src/modules/suppliers/` — entity, repository, service (CRUD base)
- `src/modules/settings/` — entity, repository, service (SMTP config cifrata)
- `src/modules/audit/` — entity, repository, service
- `src/modules/outbox/` — entity, repository, service
- `migrations/1700000000000-InitialSchema.ts` — schema completo + RLS policies
- `seeds/bootstrap-admin.ts`
- `test/` — integration tests (testcontainers)

### `apps/web/`
- `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.cjs`
- `Dockerfile`, `nginx.conf`, `.dockerignore`
- `index.html`
- `src/main.tsx`, `src/App.tsx`
- `src/lib/api.ts` — axios + interceptor refresh token
- `src/lib/auth-store.ts` — zustand store
- `src/lib/query-client.ts`
- `src/routes/__root.tsx`
- `src/routes/_public/login.tsx`, `register.tsx`, `verify-email.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `accept-invite.tsx`
- `src/routes/_admin/__layout.tsx`, `index.tsx`
- `src/routes/_supplier/__layout.tsx`, `index.tsx`
- `src/components/ui/` — shadcn (Button, Input, Form, Label, Card, Toast)
- `src/i18n/it.json`

---

## Task 0: Pre-flight

**Files:**
- Create: `.gitignore`, `.editorconfig`, `.nvmrc`, `README.md`

- [ ] **Step 1: Inizializza git se non esiste**

```bash
cd /c/xampp/htdocs/app-gestionali/soulmovie
git init -b main
```

Expected: `Initialized empty Git repository...`

- [ ] **Step 2: Crea .gitignore**

```
node_modules
dist
build
.env
.env.local
*.log
.DS_Store
.vscode
.idea
coverage
.pnpm-store
```

- [ ] **Step 3: Crea .editorconfig**

```
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

- [ ] **Step 4: Crea .nvmrc**

```
20.11.1
```

- [ ] **Step 5: Crea README.md minimo**

```markdown
# Soulmovie

Gestionale fornitori. Vedi `docs/superpowers/specs/` per design.

## Requisiti
Node 20, pnpm 9, Docker Desktop.

## Setup dev
```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: initial repo setup"
```

---

## Task 1: Monorepo pnpm workspaces

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`

- [ ] **Step 1: Crea pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Crea package.json root**

```json
{
  "name": "soulmovie",
  "private": true,
  "version": "0.1.0",
  "engines": { "node": ">=20", "pnpm": ">=9" },
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "db:migrate": "pnpm --filter @soulmovie/api migration:run",
    "db:seed": "pnpm --filter @soulmovie/api seed",
    "infra:up": "docker compose -f infra/docker-compose.yml up -d",
    "infra:down": "docker compose -f infra/docker-compose.yml down",
    "infra:logs": "docker compose -f infra/docker-compose.yml logs -f"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "@types/node": "^20.12.7"
  }
}
```

- [ ] **Step 3: Crea tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "incremental": true
  }
}
```

- [ ] **Step 4: Verifica setup**

```bash
pnpm install
```

Expected: `Done` senza errori, crea `node_modules` e `pnpm-lock.yaml`.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: setup pnpm monorepo"
```

---

## Task 2: Package shared (zod schemas + enums)

**Files:**
- Create: `packages/shared/package.json`, `tsconfig.json`, `src/index.ts`, `src/enums.ts`, `src/error-codes.ts`, `src/schemas/auth.ts`, `src/schemas/common.ts`

- [ ] **Step 1: Crea packages/shared/package.json**

```json
{
  "name": "@soulmovie/shared",
  "version": "0.1.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "echo skip",
    "test": "echo skip",
    "dev": "echo skip"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Crea packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Crea src/enums.ts**

```typescript
export enum Role { ADMIN = 'admin', SUPPLIER = 'supplier' }
export enum UserStatus { INVITED = 'invited', PENDING_EMAIL = 'pending_email', ACTIVE = 'active', DISABLED = 'disabled' }
export enum ApprovalStatus { PENDING = 'pending', APPROVED = 'approved', REJECTED = 'rejected' }
export enum RegistrationSource { SELF = 'self', INVITE = 'invite' }
```

- [ ] **Step 4: Crea src/error-codes.ts**

```typescript
export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_SUPPLIER_NOT_APPROVED: 'AUTH_SUPPLIER_NOT_APPROVED',
  AUTH_USER_DISABLED: 'AUTH_USER_DISABLED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_REUSED: 'AUTH_TOKEN_REUSED',
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  PIVA_ALREADY_REGISTERED: 'PIVA_ALREADY_REGISTERED',
  CF_ALREADY_REGISTERED: 'CF_ALREADY_REGISTERED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RLS_FORBIDDEN: 'RLS_FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

- [ ] **Step 5: Crea src/schemas/common.ts**

```typescript
import { z } from 'zod';
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().toLowerCase().trim();
export const passwordSchema = z.string().min(10).max(128)
  .regex(/[A-Z]/, 'deve contenere maiuscola')
  .regex(/[a-z]/, 'deve contenere minuscola')
  .regex(/[0-9]/, 'deve contenere numero');
export const partitaIvaSchema = z.string().regex(/^\d{11}$/).optional().nullable();
export const codiceFiscaleSchema = z.string().regex(/^[A-Z0-9]{11,16}$/i).optional().nullable();
```

- [ ] **Step 6: Crea src/schemas/auth.ts**

```typescript
import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';

export const registerSelfSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  ragioneSociale: z.string().min(2).max(255),
});
export type RegisterSelfDto = z.infer<typeof registerSelfSchema>;

export const inviteSupplierSchema = z.object({
  email: emailSchema,
  ragioneSociale: z.string().min(2).max(255),
});
export type InviteSupplierDto = z.infer<typeof inviteSupplierSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});
export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({ token: z.string().min(10) });
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
```

- [ ] **Step 7: Crea src/index.ts**

```typescript
export * from './enums.js';
export * from './error-codes.js';
export * from './schemas/common.js';
export * from './schemas/auth.js';
```

- [ ] **Step 8: Verifica build**

```bash
pnpm --filter @soulmovie/shared build
```

Expected: crea `packages/shared/dist/` senza errori.

- [ ] **Step 9: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add zod schemas and enums"
```

---

## Task 3: Docker compose stack di sviluppo

**Files:**
- Create: `infra/docker-compose.yml`, `infra/pgbouncer/pgbouncer.ini`, `infra/pgbouncer/userlist.txt.template`, `infra/postgres/init/01-extensions.sql`, `infra/postgres/init/02-roles.sql`, `.env.example`

- [ ] **Step 1: Crea .env.example**

```bash
# Database
POSTGRES_USER=soulmovie_app
POSTGRES_PASSWORD=devpassword
POSTGRES_DB=soulmovie

# JWT
JWT_ACCESS_SECRET=changeme-access-secret-min-32-chars-long
JWT_REFRESH_SECRET=changeme-refresh-secret-min-32-chars-long
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Settings encryption (32 bytes hex = 64 chars)
SETTINGS_ENCRYPTION_KEY=00000000000000000000000000000000000000000000000000000000000000ff

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET=soulmovie

# App
API_PORT=3000
WEB_PORT=5173
WEB_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:3000

# Bootstrap admin (creato dal seed)
BOOTSTRAP_ADMIN_EMAIL=admin@soulmovie.local
BOOTSTRAP_ADMIN_PASSWORD=AdminPass123!
```

- [ ] **Step 2: Crea infra/postgres/init/01-extensions.sql**

```sql
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

- [ ] **Step 3: Crea infra/postgres/init/02-roles.sql**

```sql
-- Ruoli applicativi per RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin_role') THEN
    CREATE ROLE admin_role NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supplier_role') THEN
    CREATE ROLE supplier_role NOINHERIT;
  END IF;
END $$;

-- Il ruolo applicativo (l'utente con cui NestJS si connette) deve poter
-- eseguire SET ROLE per impersonare admin_role/supplier_role.
GRANT admin_role TO soulmovie_app;
GRANT supplier_role TO soulmovie_app;
```

- [ ] **Step 4: Crea infra/pgbouncer/pgbouncer.ini**

```ini
[databases]
soulmovie = host=postgres port=5432 dbname=soulmovie

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 200
default_pool_size = 25
ignore_startup_parameters = extra_float_digits,search_path
```

- [ ] **Step 5: Crea infra/pgbouncer/userlist.txt.template**

```
"soulmovie_app" "md5<COMPUTED_HASH>"
```

(Il vero `userlist.txt` viene generato all'avvio da uno script o copiato manualmente. Per dev, accettiamo che pgbouncer venga ricostruito con la password attuale.)

- [ ] **Step 6: Crea infra/docker-compose.yml**

```yaml
name: soulmovie

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  pgbouncer:
    image: edoburu/pgbouncer:1.22.0
    restart: unless-stopped
    environment:
      DB_USER: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_HOST: postgres
      DB_NAME: ${POSTGRES_DB}
      POOL_MODE: transaction
      ADMIN_USERS: ${POSTGRES_USER}
      AUTH_TYPE: md5
    ports:
      - "6432:5432"
    depends_on:
      postgres:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  elastic:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.4
    restart: unless-stopped
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"
      ES_JAVA_OPTS: "-Xms512m -Xmx1g"
    volumes:
      - elastic_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    healthcheck:
      test: ["CMD-SHELL", "curl -fs http://localhost:9200 >/dev/null"]
      interval: 10s
      retries: 12

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      retries: 6

  mailhog:
    image: mailhog/mailhog:v1.0.1
    restart: unless-stopped
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # web UI

volumes:
  postgres_data:
  redis_data:
  elastic_data:
  minio_data:
```

- [ ] **Step 7: Avvia stack e verifica**

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env up -d
docker compose -f infra/docker-compose.yml ps
```

Expected: tutti i servizi `running` o `healthy` entro 60s.

- [ ] **Step 8: Test connessione Postgres**

```bash
docker compose -f infra/docker-compose.yml exec postgres psql -U soulmovie_app -d soulmovie -c "\du"
```

Expected: vede `admin_role` e `supplier_role` nella lista.

- [ ] **Step 9: Commit**

```bash
git add infra .env.example
git commit -m "feat(infra): add docker-compose dev stack"
```

---

## Task 4: NestJS API skeleton

**Files:**
- Create: `apps/api/package.json`, `tsconfig.json`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts`, `src/config/configuration.ts`

- [ ] **Step 1: Crea apps/api/package.json**

```json
{
  "name": "@soulmovie/api",
  "version": "0.1.0",
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start:prod": "node dist/main.js",
    "start:worker": "node dist/worker.js",
    "lint": "eslint \"src/**/*.ts\" --fix",
    "test": "vitest run",
    "test:watch": "vitest",
    "migration:generate": "typeorm-ts-node-esm -d src/infra/typeorm/data-source.ts migration:generate",
    "migration:run": "typeorm-ts-node-esm -d src/infra/typeorm/data-source.ts migration:run",
    "migration:revert": "typeorm-ts-node-esm -d src/infra/typeorm/data-source.ts migration:revert",
    "seed": "ts-node -r tsconfig-paths/register seeds/bootstrap-admin.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.7",
    "@nestjs/core": "^10.3.7",
    "@nestjs/platform-express": "^10.3.7",
    "@nestjs/config": "^3.2.2",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/typeorm": "^10.0.2",
    "@nestjs/throttler": "^5.1.2",
    "@nestjs/bullmq": "^10.1.1",
    "@soulmovie/shared": "workspace:*",
    "argon2": "^0.40.1",
    "bullmq": "^5.7.8",
    "cookie-parser": "^1.4.6",
    "helmet": "^7.1.0",
    "ioredis": "^5.4.1",
    "nodemailer": "^6.9.13",
    "pg": "^8.11.5",
    "pino": "^9.0.0",
    "pino-http": "^9.0.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "typeorm": "^0.3.20",
    "typeorm-transactional": "^0.5.0",
    "uuid": "^9.0.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.2",
    "@nestjs/testing": "^10.3.7",
    "@types/cookie-parser": "^1.4.7",
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.7",
    "@types/nodemailer": "^6.4.15",
    "@types/uuid": "^9.0.8",
    "supertest": "^7.0.0",
    "testcontainers": "^10.9.0",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Crea apps/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": "src",
    "paths": { "@/*": ["*"] }
  },
  "include": ["src/**/*", "seeds/**/*", "test/**/*"]
}
```

- [ ] **Step 3: Crea apps/api/nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

- [ ] **Step 4: Crea src/config/configuration.ts**

```typescript
export default () => ({
  port: parseInt(process.env.API_PORT ?? '3000', 10),
  webBaseUrl: process.env.WEB_BASE_URL ?? 'http://localhost:5173',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '6432', 10),
    user: process.env.POSTGRES_USER ?? 'soulmovie_app',
    password: process.env.POSTGRES_PASSWORD ?? 'devpassword',
    database: process.env.POSTGRES_DB ?? 'soulmovie',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  settings: {
    encryptionKey: process.env.SETTINGS_ENCRYPTION_KEY!,
  },
  bootstrap: {
    adminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@soulmovie.local',
    adminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'AdminPass123!',
  },
});
```

- [ ] **Step 5: Crea src/app.module.ts (versione iniziale)**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Crea src/main.ts (skeleton)**

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_BASE_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.API_PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 7: Installa deps e verifica build**

```bash
pnpm install
pnpm --filter @soulmovie/api build
```

Expected: build ok, crea `dist/`.

- [ ] **Step 8: Avvia in dev mode**

```bash
pnpm --filter @soulmovie/api dev
```

Expected: log `Nest application successfully started` su porta 3000. Termina con Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat(api): add NestJS skeleton"
```

---

## Task 5: TypeORM DataSource e prima migration (schema completo)

**Files:**
- Create: `apps/api/src/infra/typeorm/data-source.ts`, `apps/api/migrations/1700000000000-InitialSchema.ts`
- Create: entity classes in `apps/api/src/modules/*/entities/`

- [ ] **Step 1: Crea entity User**

File `src/modules/users/entities/user.entity.ts`:

```typescript
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role, UserStatus } from '@soulmovie/shared';
import { Supplier } from '../../suppliers/entities/supplier.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true })
  @Column({ type: 'citext' }) email!: string;
  @Column({ name: 'password_hash', type: 'text' }) passwordHash!: string;
  @Column({ type: 'enum', enum: Role }) role!: Role;
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING_EMAIL }) status!: UserStatus;
  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true }) emailVerifiedAt?: Date | null;
  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier | null;
  @Column({ name: 'supplier_id', type: 'uuid', nullable: true }) supplierId?: string | null;
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true }) lastLoginAt?: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
```

- [ ] **Step 2: Crea entity Supplier**

File `src/modules/suppliers/entities/supplier.entity.ts`:

```typescript
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ApprovalStatus, RegistrationSource } from '@soulmovie/shared';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'ragione_sociale', type: 'text' }) ragioneSociale!: string;
  @Column({ type: 'text', default: 'IT' }) paese!: string;
  @Column({ type: 'text', nullable: true }) indirizzo?: string;
  @Column({ type: 'text', nullable: true }) cap?: string;
  @Column({ type: 'text', nullable: true }) citta?: string;
  @Column({ type: 'text', nullable: true }) provincia?: string;
  @Column({ name: 'sito_web', type: 'text', nullable: true }) sitoWeb?: string;
  @Column({ name: 'email_aziendale', type: 'text', nullable: true }) emailAziendale?: string;
  @Column({ type: 'text', nullable: true }) pec?: string;
  @Column({ type: 'text', nullable: true }) telefono?: string;
  @Column({ name: 'natura_giuridica', type: 'text', nullable: true }) naturaGiuridica?: string;
  @Index({ unique: true, where: '"codice_fiscale" IS NOT NULL' })
  @Column({ name: 'codice_fiscale', type: 'text', nullable: true }) codiceFiscale?: string | null;
  @Index({ unique: true, where: '"partita_iva" IS NOT NULL' })
  @Column({ name: 'partita_iva', type: 'text', nullable: true }) partitaIva?: string | null;
  @Column({ type: 'text', nullable: true }) iban?: string;
  @Column({ type: 'text', default: 'EUR' }) valuta!: string;
  @Column({ name: 'gruppo_iva', type: 'text', nullable: true }) gruppoIva?: string;
  @Column({ name: 'registration_source', type: 'enum', enum: RegistrationSource }) registrationSource!: RegistrationSource;
  @Column({ name: 'approval_status', type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING }) approvalStatus!: ApprovalStatus;
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true }) approvedAt?: Date | null;
  @Column({ name: 'approved_by', type: 'uuid', nullable: true }) approvedBy?: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
```

- [ ] **Step 3: Crea entità token (refresh, password_reset, email_verification, invite)**

File `src/modules/auth/entities/refresh-token.entity.ts`:

```typescript
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'text' }) tokenHash!: string;
  @Column({ name: 'family_id', type: 'uuid' }) familyId!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true }) usedAt?: Date | null;
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt?: Date | null;
  @Column({ type: 'inet', nullable: true }) ip?: string | null;
  @Column({ name: 'user_agent', type: 'text', nullable: true }) userAgent?: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
```

File `src/modules/auth/entities/one-time-token.entity.ts` (usata per password reset, email verification, invite):

```typescript
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type OneTimeTokenPurpose = 'password_reset' | 'email_verification' | 'invite';

@Entity('one_time_tokens')
export class OneTimeToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'text' }) tokenHash!: string;
  @Column({ type: 'text' }) purpose!: OneTimeTokenPurpose;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true }) usedAt?: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
```

- [ ] **Step 4: Crea entity SystemSetting, AuditLog, OutboxEvent**

File `src/modules/settings/entities/system-setting.entity.ts`:

```typescript
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ type: 'text' }) key!: string;
  @Column({ name: 'value_encrypted', type: 'bytea' }) valueEncrypted!: Buffer;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy?: string | null;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
```

File `src/modules/audit/entities/audit-log.entity.ts`:

```typescript
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_log')
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId?: string | null;
  @Column({ name: 'supplier_id', type: 'uuid', nullable: true }) supplierId?: string | null;
  @Column({ type: 'text' }) action!: string;
  @Column({ name: 'entity_type', type: 'text' }) entityType!: string;
  @Column({ name: 'entity_id', type: 'uuid', nullable: true }) entityId?: string | null;
  @Column({ type: 'jsonb', nullable: true }) before?: object | null;
  @Column({ type: 'jsonb', nullable: true }) after?: object | null;
  @Column({ type: 'inet', nullable: true }) ip?: string | null;
  @Column({ name: 'user_agent', type: 'text', nullable: true }) userAgent?: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
```

File `src/modules/outbox/entities/outbox-event.entity.ts`:

```typescript
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('outbox_events')
@Index(['processedAt', 'createdAt'])
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'aggregate_type', type: 'text' }) aggregateType!: string;
  @Column({ name: 'aggregate_id', type: 'uuid' }) aggregateId!: string;
  @Column({ name: 'event_type', type: 'text' }) eventType!: string;
  @Column({ type: 'jsonb' }) payload!: object;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true }) processedAt?: Date | null;
}
```

- [ ] **Step 5: Crea data-source per CLI migrations**

File `src/infra/typeorm/data-source.ts`:

```typescript
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10), // diretto a postgres per migrations (no pgbouncer)
  username: process.env.POSTGRES_USER ?? 'soulmovie_app',
  password: process.env.POSTGRES_PASSWORD ?? 'devpassword',
  database: process.env.POSTGRES_DB ?? 'soulmovie',
  entities: ['src/modules/**/entities/*.entity.ts'],
  migrations: ['migrations/*.ts'],
  synchronize: false,
  logging: ['error', 'warn'],
});
```

- [ ] **Step 6: Crea migration iniziale completa**

File `migrations/1700000000000-InitialSchema.ts`:

```typescript
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
      );
      CREATE UNIQUE INDEX "suppliers_codice_fiscale_unique" ON "suppliers"("codice_fiscale") WHERE "codice_fiscale" IS NOT NULL;
      CREATE UNIQUE INDEX "suppliers_partita_iva_unique" ON "suppliers"("partita_iva") WHERE "partita_iva" IS NOT NULL;
    `);

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
      );
      CREATE UNIQUE INDEX "users_email_unique" ON "users"("email");
    `);

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
      );
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
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "system_settings" (
        "key" text PRIMARY KEY,
        "value_encrypted" bytea NOT NULL,
        "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
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
      );
      CREATE INDEX "audit_log_entity_idx" ON "audit_log"("entity_type","entity_id","created_at");
      CREATE INDEX "audit_log_user_idx" ON "audit_log"("user_id","created_at");
    `);

    await queryRunner.query(`
      CREATE TABLE "outbox_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "aggregate_type" text NOT NULL,
        "aggregate_id" uuid NOT NULL,
        "event_type" text NOT NULL,
        "payload" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "processed_at" timestamptz
      );
      CREATE INDEX "outbox_unprocessed_idx" ON "outbox_events"("processed_at","created_at") WHERE "processed_at" IS NULL;
    `);

    // Permessi sui ruoli applicativi
    await queryRunner.query(`
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admin_role;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO supplier_role;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO admin_role, supplier_role;

      -- RLS sulle tabelle supplier-owned (in Fase 1: solo "suppliers")
      ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "supplier_self_isolation" ON "suppliers"
        FOR ALL TO supplier_role
        USING ("id" = current_setting('app.current_supplier_id', true)::uuid)
        WITH CHECK ("id" = current_setting('app.current_supplier_id', true)::uuid);

      -- audit_log: append-only per supplier_role (no UPDATE/DELETE), admin_role bypassa
      ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "audit_log_insert_only" ON "audit_log"
        FOR INSERT TO supplier_role WITH CHECK (true);
      CREATE POLICY "audit_log_select_self" ON "audit_log"
        FOR SELECT TO supplier_role
        USING ("supplier_id" = current_setting('app.current_supplier_id', true)::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "outbox_events" CASCADE;
      DROP TABLE IF EXISTS "audit_log" CASCADE;
      DROP TABLE IF EXISTS "system_settings" CASCADE;
      DROP TABLE IF EXISTS "one_time_tokens" CASCADE;
      DROP TABLE IF EXISTS "refresh_tokens" CASCADE;
      DROP TABLE IF EXISTS "users" CASCADE;
      DROP TABLE IF EXISTS "suppliers" CASCADE;
      DROP TYPE IF EXISTS "registration_source_enum";
      DROP TYPE IF EXISTS "approval_status_enum";
      DROP TYPE IF EXISTS "user_status_enum";
      DROP TYPE IF EXISTS "role_enum";
    `);
  }
}
```

- [ ] **Step 7: Esegui migration**

```bash
pnpm --filter @soulmovie/api migration:run
```

Expected: log `Migration InitialSchema1700000000000 has been executed successfully`.

- [ ] **Step 8: Verifica schema**

```bash
docker compose -f infra/docker-compose.yml exec postgres psql -U soulmovie_app -d soulmovie -c "\dt"
```

Expected: vede 7 tabelle (suppliers, users, refresh_tokens, one_time_tokens, system_settings, audit_log, outbox_events).

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat(api): initial database schema with RLS"
```

---

## Task 6: TypeORM module + RequestContext interceptor (RLS bridge)

**Files:**
- Create: `apps/api/src/infra/typeorm/typeorm.module.ts`, `apps/api/src/common/context/request-context.ts`, `apps/api/src/common/interceptors/request-context.interceptor.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Crea TypeOrm module**

File `src/infra/typeorm/typeorm.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('database.host'),
        port: cfg.get('database.port'),
        username: cfg.get('database.user'),
        password: cfg.get('database.password'),
        database: cfg.get('database.database'),
        autoLoadEntities: true,
        synchronize: false,
        // PgBouncer transaction mode è compatibile, ma disabilitiamo prepared statements
        extra: { max: 20 },
      }),
      dataSourceFactory: async (options) => {
        const ds = await new DataSource(options!).initialize();
        addTransactionalDataSource(ds);
        return ds;
      },
    }),
  ],
})
export class AppTypeOrmModule {}
```

- [ ] **Step 2: Crea AsyncLocalStorage context**

File `src/common/context/request-context.ts`:

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';
import { Role } from '@soulmovie/shared';

export interface RequestContext {
  userId?: string;
  role?: Role;
  supplierId?: string;
  ip?: string;
  userAgent?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();
export const getRequestContext = (): RequestContext | undefined => requestContextStorage.getStore();
```

- [ ] **Step 3: Crea interceptor che imposta SET LOCAL e contesto**

File `src/common/interceptors/request-context.interceptor.ts`:

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Role } from '@soulmovie/shared';
import { requestContextStorage, RequestContext } from '../context/request-context.js';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user; // popolato dal JwtAuthGuard
    const ctx: RequestContext = {
      userId: user?.id,
      role: user?.role,
      supplierId: user?.supplierId,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    };
    return new Observable((subscriber) => {
      requestContextStorage.run(ctx, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
```

- [ ] **Step 4: Crea TransactionalDb helper che applica SET LOCAL**

File `src/infra/typeorm/transactional-db.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { runInTransaction, IsolationLevel } from 'typeorm-transactional';
import { Role } from '@soulmovie/shared';
import { getRequestContext } from '../../common/context/request-context.js';

@Injectable()
export class TransactionalDb {
  constructor(private readonly ds: DataSource) {}

  async run<T>(fn: (em: EntityManager) => Promise<T>): Promise<T> {
    return runInTransaction(async () => {
      const em = this.ds.manager;
      const ctx = getRequestContext();
      if (ctx?.role === Role.ADMIN) {
        await em.query(`SET LOCAL ROLE admin_role`);
      } else if (ctx?.role === Role.SUPPLIER && ctx.supplierId) {
        await em.query(`SET LOCAL ROLE supplier_role`);
        await em.query(`SET LOCAL app.current_supplier_id = '${ctx.supplierId}'`);
      }
      // Per richieste pubbliche (login, register) non si imposta nulla → soulmovie_app diretto
      return fn(em);
    }, { isolationLevel: 'READ COMMITTED' as IsolationLevel });
  }
}
```

> **Nota:** l'interpolazione di `supplierId` nello statement è sicura perché valore validato come UUID dal JWT, ma volendo si può usare `set_config('app.current_supplier_id', $1, true)` come query parametrizzata. Default qui è validazione UUID upstream.

- [ ] **Step 5: Aggiorna app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { initializeTransactionalContext } from 'typeorm-transactional';
import configuration from './config/configuration.js';
import { AppTypeOrmModule } from './infra/typeorm/typeorm.module.js';
import { TransactionalDb } from './infra/typeorm/transactional-db.service.js';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor.js';

initializeTransactionalContext();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    AppTypeOrmModule,
  ],
  providers: [
    TransactionalDb,
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
  exports: [TransactionalDb],
})
export class AppModule {}
```

- [ ] **Step 6: Verifica boot**

```bash
pnpm --filter @soulmovie/api dev
```

Expected: log `Nest application successfully started` senza errori di connessione DB.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): typeorm module with RLS request context"
```

---

## Task 7: Crypto service (AES-256-GCM) + Settings module

**Files:**
- Create: `apps/api/src/infra/crypto/crypto.service.ts`, `apps/api/src/modules/settings/settings.module.ts`, `settings.service.ts`, `settings.controller.ts`

- [ ] **Step 1: Test crypto service (TDD)**

File `apps/api/test/infra/crypto.service.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CryptoService } from '../../src/infra/crypto/crypto.service.js';

describe('CryptoService', () => {
  const key = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
  const svc = new CryptoService(key);

  it('encrypts and decrypts a string symmetrically', () => {
    const enc = svc.encrypt('hello world');
    expect(enc).toBeInstanceOf(Buffer);
    expect(svc.decrypt(enc)).toBe('hello world');
  });

  it('produces different ciphertext each call (random IV)', () => {
    const a = svc.encrypt('same');
    const b = svc.encrypt('same');
    expect(a.equals(b)).toBe(false);
  });

  it('fails on tampered ciphertext', () => {
    const enc = svc.encrypt('hello');
    enc[15] = enc[15] ^ 0xff;
    expect(() => svc.decrypt(enc)).toThrow();
  });
});
```

- [ ] **Step 2: Run test (fail)**

```bash
pnpm --filter @soulmovie/api test test/infra/crypto.service.spec.ts
```

Expected: FAIL — `Cannot find module 'crypto.service'`.

- [ ] **Step 3: Implementa CryptoService**

File `src/infra/crypto/crypto.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(keyHex: string) {
    if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      throw new Error('SETTINGS_ENCRYPTION_KEY must be 32 bytes hex (64 chars)');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plain: string): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]); // [12 IV][16 tag][ciphertext]
  }

  decrypt(blob: Buffer): string {
    const iv = blob.subarray(0, 12);
    const tag = blob.subarray(12, 28);
    const ct = blob.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  }
}
```

- [ ] **Step 4: Run test (pass)**

```bash
pnpm --filter @soulmovie/api test test/infra/crypto.service.spec.ts
```

Expected: 3 tests passed.

- [ ] **Step 5: Crea Settings module**

File `src/modules/settings/settings.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService } from '../../infra/crypto/crypto.service.js';
import { SystemSetting } from './entities/system-setting.entity.js';

export type SmtpSettings = {
  host: string; port: number; user: string; password: string; from: string; tls: boolean;
};

const SMTP_KEY = 'smtp.config';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting) private readonly repo: Repository<SystemSetting>,
    private readonly crypto: CryptoService,
  ) {}

  async getSmtp(): Promise<SmtpSettings | null> {
    const row = await this.repo.findOne({ where: { key: SMTP_KEY } });
    if (!row) return null;
    return JSON.parse(this.crypto.decrypt(row.valueEncrypted));
  }

  async setSmtp(value: SmtpSettings, updatedBy: string): Promise<void> {
    const enc = this.crypto.encrypt(JSON.stringify(value));
    await this.repo.upsert(
      { key: SMTP_KEY, valueEncrypted: enc, updatedBy, updatedAt: new Date() },
      ['key'],
    );
  }
}
```

- [ ] **Step 6: Crea SettingsModule e registra in AppModule**

File `src/modules/settings/settings.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SystemSetting } from './entities/system-setting.entity.js';
import { SettingsService } from './settings.service.js';
import { CryptoService } from '../../infra/crypto/crypto.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  providers: [
    SettingsService,
    { provide: CryptoService, useFactory: (cfg: ConfigService) => new CryptoService(cfg.get('settings.encryptionKey')!), inject: [ConfigService] },
  ],
  exports: [SettingsService, CryptoService],
})
export class SettingsModule {}
```

Aggiungi `SettingsModule` agli `imports` di `AppModule`.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): crypto service and encrypted settings storage"
```

---

## Task 8: Mail service (nodemailer + fallback env→system_settings)

**Files:**
- Create: `apps/api/src/infra/mail/mail.module.ts`, `apps/api/src/infra/mail/mail.service.ts`

- [ ] **Step 1: Crea MailService**

File `src/infra/mail/mail.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { SettingsService } from '../../modules/settings/settings.service.js';

interface SendArgs { to: string; subject: string; html: string; text?: string; }

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  constructor(
    private readonly cfg: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  private async getTransporter(): Promise<Transporter> {
    const smtp = await this.settings.getSmtp();
    if (smtp) {
      return nodemailer.createTransport({
        host: smtp.host, port: smtp.port, secure: smtp.tls,
        auth: { user: smtp.user, pass: smtp.password },
      });
    }
    // Fallback dev: MailHog senza auth
    return nodemailer.createTransport({
      host: this.cfg.get('mail.devHost') ?? 'localhost',
      port: parseInt(this.cfg.get('mail.devPort') ?? '1025', 10),
      secure: false,
      ignoreTLS: true,
    });
  }

  async send(args: SendArgs): Promise<void> {
    const tx = await this.getTransporter();
    const smtp = await this.settings.getSmtp();
    const from = smtp?.from ?? 'noreply@soulmovie.local';
    await tx.sendMail({ from, ...args });
    this.log.log(`mail sent to=${args.to} subject="${args.subject}"`);
  }
}
```

- [ ] **Step 2: Crea MailModule**

File `src/infra/mail/mail.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MailService } from './mail.service.js';
import { SettingsModule } from '../../modules/settings/settings.module.js';

@Module({ imports: [SettingsModule], providers: [MailService], exports: [MailService] })
export class MailModule {}
```

Aggiungi `mail.devHost`/`devPort` a `configuration.ts` (`MAIL_DEV_HOST`, `MAIL_DEV_PORT` env, default `localhost:1025`).

Importa `MailModule` in `AppModule`.

- [ ] **Step 3: Smoke test manuale**

Avvia dev, in un test script (o tinker) chiama `mailService.send({...})` e verifica su `http://localhost:8025` (MailHog UI) che il messaggio arrivi.

- [ ] **Step 4: Commit**

```bash
git add apps/api
git commit -m "feat(api): mail service with runtime SMTP config"
```

---

## Task 9: Auth — register self + verify email

**Files:**
- Create: `apps/api/src/modules/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `tokens.service.ts`, `password.service.ts`, `dto/`, `templates/`
- Create: `apps/api/src/modules/users/users.service.ts`, `users.module.ts`
- Create: `apps/api/src/common/pipes/zod.pipe.ts`

- [ ] **Step 1: Crea ZodValidationPipe**

File `src/common/pipes/zod.pipe.ts`:

```typescript
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';
import { ErrorCodes } from '@soulmovie/shared';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}
  transform(value: unknown): T {
    const r = this.schema.safeParse(value);
    if (!r.success) {
      throw new BadRequestException({
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'Validation failed', details: r.error.issues },
      });
    }
    return r.data;
  }
}
```

- [ ] **Step 2: Crea PasswordService**

File `src/modules/auth/password.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

@Injectable()
export class PasswordService {
  hash(plain: string) {
    return argon2.hash(plain, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
  }
  verify(hash: string, plain: string) { return argon2.verify(hash, plain); }
}
```

- [ ] **Step 3: Crea TokensService (one-time tokens + refresh tokens)**

File `src/modules/auth/tokens.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { OneTimeToken, OneTimeTokenPurpose } from './entities/one-time-token.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { v4 as uuid } from 'uuid';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(OneTimeToken) private readonly otRepo: Repository<OneTimeToken>,
    @InjectRepository(RefreshToken) private readonly rtRepo: Repository<RefreshToken>,
  ) {}

  async issueOneTime(userId: string, purpose: OneTimeTokenPurpose, ttlMs: number): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    await this.otRepo.insert({
      userId, tokenHash: sha256(raw), purpose,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return raw;
  }

  async consumeOneTime(raw: string, purpose: OneTimeTokenPurpose): Promise<string> {
    const hash = sha256(raw);
    const row = await this.otRepo.findOne({ where: { tokenHash: hash, purpose } });
    if (!row || row.usedAt || row.expiresAt < new Date()) throw new Error('invalid or expired token');
    await this.otRepo.update(row.id, { usedAt: new Date() });
    return row.userId;
  }

  async issueRefresh(userId: string, familyId: string | null, ttlMs: number, ip?: string, ua?: string): Promise<{ raw: string; familyId: string }> {
    const raw = randomBytes(48).toString('hex');
    const fam = familyId ?? uuid();
    await this.rtRepo.insert({
      userId, tokenHash: sha256(raw), familyId: fam,
      expiresAt: new Date(Date.now() + ttlMs), ip, userAgent: ua,
    });
    return { raw, familyId: fam };
  }

  async rotateRefresh(raw: string, ttlMs: number, ip?: string, ua?: string): Promise<{ userId: string; raw: string; familyId: string }> {
    const hash = sha256(raw);
    const row = await this.rtRepo.findOne({ where: { tokenHash: hash } });
    if (!row || row.revokedAt || row.expiresAt < new Date()) throw new Error('invalid token');
    if (row.usedAt) {
      // Riuso rilevato → revoca intera famiglia
      await this.rtRepo.update({ familyId: row.familyId }, { revokedAt: new Date() });
      throw new Error('token reuse detected');
    }
    await this.rtRepo.update(row.id, { usedAt: new Date() });
    const fresh = await this.issueRefresh(row.userId, row.familyId, ttlMs, ip, ua);
    return { userId: row.userId, ...fresh };
  }

  async revokeAllForUser(userId: string) {
    await this.rtRepo.update({ userId, revokedAt: undefined }, { revokedAt: new Date() });
  }
}
```

- [ ] **Step 4: Crea AuthService (register self + verify email)**

File `src/modules/auth/auth.service.ts`:

```typescript
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { ApprovalStatus, ErrorCodes, RegistrationSource, Role, UserStatus, RegisterSelfDto } from '@soulmovie/shared';
import { User } from '../users/entities/user.entity.js';
import { Supplier } from '../suppliers/entities/supplier.entity.js';
import { PasswordService } from './password.service.js';
import { TokensService } from './tokens.service.js';
import { MailService } from '../../infra/mail/mail.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly ds: DataSource,
    private readonly password: PasswordService,
    private readonly tokens: TokensService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  @Transactional()
  async registerSelf(dto: RegisterSelfDto): Promise<void> {
    const userRepo = this.ds.getRepository(User);
    const supplierRepo = this.ds.getRepository(Supplier);
    const exists = await userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException({ error: { code: ErrorCodes.EMAIL_ALREADY_REGISTERED, message: 'Email già registrata' } });

    const supplier = await supplierRepo.save(supplierRepo.create({
      ragioneSociale: dto.ragioneSociale,
      registrationSource: RegistrationSource.SELF,
      approvalStatus: ApprovalStatus.PENDING,
    }));
    const user = await userRepo.save(userRepo.create({
      email: dto.email,
      passwordHash: await this.password.hash(dto.password),
      role: Role.SUPPLIER,
      status: UserStatus.PENDING_EMAIL,
      supplierId: supplier.id,
    }));

    const raw = await this.tokens.issueOneTime(user.id, 'email_verification', 24 * 60 * 60 * 1000);
    const link = `${this.cfg.get('webBaseUrl')}/verify-email?token=${raw}`;
    await this.mail.send({
      to: dto.email,
      subject: 'Verifica il tuo indirizzo email — Soulmovie',
      html: `<p>Ciao,</p><p>verifica la tua email cliccando: <a href="${link}">${link}</a></p><p>Il link scade in 24 ore.</p>`,
    });
  }

  @Transactional()
  async verifyEmail(token: string): Promise<void> {
    const userId = await this.tokens.consumeOneTime(token, 'email_verification');
    await this.ds.getRepository(User).update(userId, {
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    });
  }
}
```

- [ ] **Step 5: Crea AuthController (endpoint register/verify-email)**

File `src/modules/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Get, HttpCode, Post, Query, UsePipes } from '@nestjs/common';
import { registerSelfSchema, verifyEmailSchema } from '@soulmovie/shared';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register/self')
  @HttpCode(202)
  @UsePipes(new ZodValidationPipe(registerSelfSchema))
  async registerSelf(@Body() dto: any) {
    await this.auth.registerSelf(dto);
    return { ok: true };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    const parsed = verifyEmailSchema.parse({ token });
    await this.auth.verifyEmail(parsed.token);
    return { ok: true };
  }
}
```

- [ ] **Step 6: Crea AuthModule**

File `src/modules/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { Supplier } from '../suppliers/entities/supplier.entity.js';
import { OneTimeToken } from './entities/one-time-token.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TokensService } from './tokens.service.js';
import { PasswordService } from './password.service.js';
import { MailModule } from '../../infra/mail/mail.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Supplier, OneTimeToken, RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('jwt.accessSecret'),
        signOptions: { expiresIn: cfg.get('jwt.accessTtl') },
      }),
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokensService, PasswordService],
  exports: [AuthService, TokensService, PasswordService],
})
export class AuthModule {}
```

Aggiungi `AuthModule` agli imports di `AppModule`.

- [ ] **Step 7: Test E2E manuale**

Avvia dev (`pnpm dev`). Chiama:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register/self \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Password123","ragioneSociale":"Acme SRL"}'
```

Expected: `{ "ok": true }`. Vai su MailHog (http://localhost:8025) → vedi email con link verify. Apri il link → user diventa `active`.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(auth): register self-service + email verification"
```

---

## Task 10: Auth — login + refresh + logout (con cookie httpOnly)

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`, `auth.controller.ts`
- Create: `apps/api/src/modules/auth/jwt.strategy.ts`, `apps/api/src/common/guards/jwt-auth.guard.ts`, `apps/api/src/common/decorators/current-user.decorator.ts`, `public.decorator.ts`

- [ ] **Step 1: Aggiungi metodi login/refresh/logout in AuthService**

```typescript
// in AuthService

async login(email: string, password: string, ip?: string, ua?: string) {
  const userRepo = this.ds.getRepository(User);
  const supplierRepo = this.ds.getRepository(Supplier);
  const user = await userRepo.findOne({ where: { email } });
  if (!user || !(await this.password.verify(user.passwordHash, password))) {
    throw new UnauthorizedException({ error: { code: ErrorCodes.AUTH_INVALID_CREDENTIALS, message: 'Credenziali non valide' } });
  }
  if (user.status !== UserStatus.ACTIVE) {
    const code = user.status === UserStatus.PENDING_EMAIL ? ErrorCodes.AUTH_EMAIL_NOT_VERIFIED
      : user.status === UserStatus.DISABLED ? ErrorCodes.AUTH_USER_DISABLED
      : ErrorCodes.AUTH_INVALID_CREDENTIALS;
    throw new UnauthorizedException({ error: { code, message: 'Account non attivo' } });
  }
  if (user.role === Role.SUPPLIER && user.supplierId) {
    const sup = await supplierRepo.findOne({ where: { id: user.supplierId } });
    if (sup?.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.AUTH_SUPPLIER_NOT_APPROVED, message: 'Account in attesa di approvazione' } });
    }
  }
  await userRepo.update(user.id, { lastLoginAt: new Date() });
  return this.issueTokens(user, ip, ua);
}

private async issueTokens(user: User, ip?: string, ua?: string) {
  const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role, supplierId: user.supplierId });
  const refresh = await this.tokens.issueRefresh(user.id, null, this.parseTtl(this.cfg.get('jwt.refreshTtl')!), ip, ua);
  return { accessToken, refreshToken: refresh.raw, user: { id: user.id, email: user.email, role: user.role, supplierId: user.supplierId } };
}

async refresh(rawRefresh: string, ip?: string, ua?: string) {
  const ttl = this.parseTtl(this.cfg.get('jwt.refreshTtl')!);
  const rotated = await this.tokens.rotateRefresh(rawRefresh, ttl, ip, ua);
  const userRepo = this.ds.getRepository(User);
  const user = await userRepo.findOneOrFail({ where: { id: rotated.userId } });
  const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role, supplierId: user.supplierId });
  return { accessToken, refreshToken: rotated.raw, user: { id: user.id, email: user.email, role: user.role, supplierId: user.supplierId } };
}

async logout(userId: string) { await this.tokens.revokeAllForUser(userId); }

private parseTtl(s: string): number {
  const m = s.match(/^(\d+)([smhd])$/);
  if (!m) throw new Error('invalid TTL');
  const n = parseInt(m[1], 10);
  return n * ({ s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]]!);
}
```

Aggiungi import necessari (`UnauthorizedException` da `@nestjs/common`).

- [ ] **Step 2: Crea JwtStrategy + Guard + decorators**

File `src/modules/auth/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: cfg.get('jwt.accessSecret'),
    });
  }
  async validate(payload: any) {
    return { id: payload.sub, role: payload.role, supplierId: payload.supplierId };
  }
}
```

(Aggiungi `passport`, `passport-jwt`, `@nestjs/passport`, `@types/passport-jwt` alle deps di apps/api.)

File `src/common/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) { super(); }
  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    return super.canActivate(ctx);
  }
}
```

File `src/common/decorators/public.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

File `src/common/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@soulmovie/shared';
export interface AuthUser { id: string; role: Role; supplierId?: string; }
export const CurrentUser = createParamDecorator(
  (_d: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
```

Registra `JwtAuthGuard` come `APP_GUARD` globale in `AppModule` providers.

- [ ] **Step 3: Aggiungi endpoint login/refresh/logout in controller**

File `auth.controller.ts` aggiunge:

```typescript
@Public()
@Post('login')
@UsePipes(new ZodValidationPipe(loginSchema))
async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
  const out = await this.auth.login(dto.email, dto.password, req.ip, req.get('user-agent'));
  this.setRefreshCookie(res, out.refreshToken);
  return { accessToken: out.accessToken, user: out.user };
}

@Public()
@Post('refresh')
@HttpCode(200)
async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
  const raw = req.cookies?.['sm_refresh'];
  if (!raw) throw new UnauthorizedException({ error: { code: ErrorCodes.AUTH_TOKEN_INVALID, message: 'no refresh cookie' } });
  const out = await this.auth.refresh(raw, req.ip, req.get('user-agent'));
  this.setRefreshCookie(res, out.refreshToken);
  return { accessToken: out.accessToken, user: out.user };
}

@Post('logout')
@HttpCode(204)
async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
  await this.auth.logout(user.id);
  res.clearCookie('sm_refresh', { path: '/api/v1/auth' });
}

private setRefreshCookie(res: Response, raw: string) {
  res.cookie('sm_refresh', raw, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
```

(Import `Req`, `Res`, `UnauthorizedException`, `Request`/`Response` express, `AuthUser`, `loginSchema`, `LoginDto`, `ErrorCodes`, `CurrentUser`, `Public`.)

- [ ] **Step 4: Test manuale flow completo**

```bash
# register self
curl -X POST http://localhost:3000/api/v1/auth/register/self ... # come Task 9

# clicca link verify in MailHog → user attivo

# login (se è SUPPLIER non approvato, fallisce con AUTH_SUPPLIER_NOT_APPROVED — atteso)

# crea admin via seed (Task 12) e fa login admin
curl -i -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -c cookies.txt \
  -d '{"email":"admin@soulmovie.local","password":"AdminPass123!"}'

# refresh
curl -i -X POST http://localhost:3000/api/v1/auth/refresh -b cookies.txt -c cookies.txt

# logout
curl -i -X POST http://localhost:3000/api/v1/auth/logout -b cookies.txt \
  -H "Authorization: Bearer <accessToken>"
```

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(auth): login, refresh rotation, logout, JWT guard"
```

---

## Task 11: Auth — invite admin + accept invite + forgot/reset password

**Files:**
- Modify: `auth.service.ts`, `auth.controller.ts`

- [ ] **Step 1: Aggiungi metodi `inviteSupplier`, `acceptInvite`, `forgotPassword`, `resetPassword`**

In `AuthService`:

```typescript
@Transactional()
async inviteSupplier(dto: InviteSupplierDto, invitedBy: string): Promise<void> {
  const userRepo = this.ds.getRepository(User);
  const supplierRepo = this.ds.getRepository(Supplier);
  const exists = await userRepo.findOne({ where: { email: dto.email } });
  if (exists) throw new ConflictException({ error: { code: ErrorCodes.EMAIL_ALREADY_REGISTERED, message: 'Email già registrata' } });

  const supplier = await supplierRepo.save(supplierRepo.create({
    ragioneSociale: dto.ragioneSociale,
    registrationSource: RegistrationSource.INVITE,
    approvalStatus: ApprovalStatus.APPROVED,
    approvedAt: new Date(), approvedBy: invitedBy,
  }));
  const user = await userRepo.save(userRepo.create({
    email: dto.email, passwordHash: 'pending-invite',
    role: Role.SUPPLIER, status: UserStatus.INVITED,
    supplierId: supplier.id,
  }));
  const raw = await this.tokens.issueOneTime(user.id, 'invite', 7 * 24 * 60 * 60 * 1000);
  const link = `${this.cfg.get('webBaseUrl')}/accept-invite?token=${raw}`;
  await this.mail.send({
    to: dto.email,
    subject: 'Sei stato invitato su Soulmovie',
    html: `<p>Clicca per impostare la tua password e accedere: <a href="${link}">${link}</a></p><p>Link valido 7 giorni.</p>`,
  });
}

@Transactional()
async acceptInvite(token: string, password: string): Promise<void> {
  const userId = await this.tokens.consumeOneTime(token, 'invite');
  const userRepo = this.ds.getRepository(User);
  await userRepo.update(userId, {
    passwordHash: await this.password.hash(password),
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
  });
}

async forgotPassword(email: string): Promise<void> {
  const user = await this.ds.getRepository(User).findOne({ where: { email } });
  if (!user) return; // non rivelare esistenza account
  const raw = await this.tokens.issueOneTime(user.id, 'password_reset', 60 * 60 * 1000);
  const link = `${this.cfg.get('webBaseUrl')}/reset-password?token=${raw}`;
  await this.mail.send({
    to: email, subject: 'Reset password Soulmovie',
    html: `<p>Reset password: <a href="${link}">${link}</a> (valido 1 ora)</p>`,
  });
}

@Transactional()
async resetPassword(token: string, password: string): Promise<void> {
  const userId = await this.tokens.consumeOneTime(token, 'password_reset');
  await this.ds.getRepository(User).update(userId, {
    passwordHash: await this.password.hash(password),
  });
  await this.tokens.revokeAllForUser(userId);
}
```

- [ ] **Step 2: Aggiungi endpoint nel controller**

```typescript
@Post('invite')
@UsePipes(new ZodValidationPipe(inviteSupplierSchema))
async invite(@CurrentUser() admin: AuthUser, @Body() dto: InviteSupplierDto) {
  if (admin.role !== Role.ADMIN) throw new ForbiddenException();
  await this.auth.inviteSupplier(dto, admin.id);
  return { ok: true };
}

@Public()
@Post('accept-invite')
@UsePipes(new ZodValidationPipe(acceptInviteSchema))
async acceptInvite(@Body() dto: AcceptInviteDto) {
  await this.auth.acceptInvite(dto.token, dto.password);
  return { ok: true };
}

@Public()
@Post('forgot-password')
@HttpCode(202)
@UsePipes(new ZodValidationPipe(forgotPasswordSchema))
async forgot(@Body() dto: ForgotPasswordDto) {
  await this.auth.forgotPassword(dto.email);
  return { ok: true };
}

@Public()
@Post('reset-password')
@UsePipes(new ZodValidationPipe(resetPasswordSchema))
async reset(@Body() dto: ResetPasswordDto) {
  await this.auth.resetPassword(dto.token, dto.password);
  return { ok: true };
}
```

- [ ] **Step 3: Test manuale invite + reset**

Login come admin, chiama `/auth/invite` con `Authorization: Bearer <token>`. Apri MailHog, clicca link, completa accept con password. Login come fornitore appena invitato — atteso success.

Forgot password: `POST /auth/forgot-password { email }` → email → reset via `POST /auth/reset-password { token, password }`.

- [ ] **Step 4: Commit**

```bash
git add apps/api
git commit -m "feat(auth): invite, accept-invite, forgot/reset password"
```

---

## Task 12: Seed bootstrap admin

**Files:**
- Create: `apps/api/seeds/bootstrap-admin.ts`

- [ ] **Step 1: Crea seed**

File `seeds/bootstrap-admin.ts`:

```typescript
import 'reflect-metadata';
import 'dotenv/config';
import dataSource from '../src/infra/typeorm/data-source.js';
import { User } from '../src/modules/users/entities/user.entity.js';
import { Role, UserStatus } from '@soulmovie/shared';
import argon2 from 'argon2';

async function run() {
  await dataSource.initialize();
  const repo = dataSource.getRepository(User);
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@soulmovie.local';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'AdminPass123!';
  const exists = await repo.findOne({ where: { email } });
  if (exists) {
    console.log(`bootstrap admin already exists (${email}), skip`);
  } else {
    await repo.insert({
      email, passwordHash: await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 }),
      role: Role.ADMIN, status: UserStatus.ACTIVE, emailVerifiedAt: new Date(),
    });
    console.log(`bootstrap admin created: ${email}`);
  }
  await dataSource.destroy();
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Esegui seed**

```bash
pnpm --filter @soulmovie/api seed
```

Expected: log `bootstrap admin created: admin@soulmovie.local`. Re-run → log `already exists, skip`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/seeds
git commit -m "feat(api): bootstrap admin seed"
```

---

## Task 13: Integration test RLS isolation

**Files:**
- Create: `apps/api/test/rls-isolation.int.spec.ts`

- [ ] **Step 1: Scrivi test che verifica isolamento RLS**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DataSource } from 'typeorm';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

describe('RLS supplier isolation', () => {
  let container: StartedTestContainer;
  let ds: DataSource;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({ POSTGRES_USER: 'postgres', POSTGRES_PASSWORD: 'postgres', POSTGRES_DB: 'test' })
      .withExposedPorts(5432)
      .start();

    ds = new DataSource({
      type: 'postgres',
      host: container.getHost(), port: container.getMappedPort(5432),
      username: 'postgres', password: 'postgres', database: 'test',
    });
    await ds.initialize();
    // Setup schema minimo + ruoli
    await ds.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await ds.query(`CREATE EXTENSION IF NOT EXISTS citext;`);
    await ds.query(`CREATE ROLE admin_role NOINHERIT BYPASSRLS;`);
    await ds.query(`CREATE ROLE supplier_role NOINHERIT;`);
    await ds.query(`GRANT admin_role, supplier_role TO postgres;`);
    await ds.query(`
      CREATE TABLE suppliers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text);
      ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
      GRANT SELECT, INSERT, UPDATE, DELETE ON suppliers TO supplier_role, admin_role;
      CREATE POLICY iso ON suppliers FOR ALL TO supplier_role
        USING (id = current_setting('app.current_supplier_id', true)::uuid)
        WITH CHECK (id = current_setting('app.current_supplier_id', true)::uuid);
    `);
    const a = await ds.query(`INSERT INTO suppliers (name) VALUES ('A') RETURNING id`);
    const b = await ds.query(`INSERT INTO suppliers (name) VALUES ('B') RETURNING id`);
    (globalThis as any).aId = a[0].id;
    (globalThis as any).bId = b[0].id;
  }, 60000);

  afterAll(async () => { await ds?.destroy(); await container?.stop(); });

  it('supplier_role with current_supplier=A sees only A', async () => {
    await ds.query(`BEGIN`);
    await ds.query(`SET LOCAL ROLE supplier_role`);
    await ds.query(`SET LOCAL app.current_supplier_id = '${(globalThis as any).aId}'`);
    const rows = await ds.query(`SELECT name FROM suppliers`);
    await ds.query(`ROLLBACK`);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('A');
  });

  it('admin_role sees both', async () => {
    await ds.query(`BEGIN`);
    await ds.query(`SET LOCAL ROLE admin_role`);
    const rows = await ds.query(`SELECT name FROM suppliers ORDER BY name`);
    await ds.query(`ROLLBACK`);
    expect(rows).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Esegui test**

```bash
pnpm --filter @soulmovie/api test test/rls-isolation.int.spec.ts
```

Expected: 2 tests passed (richiede Docker attivo per testcontainers).

- [ ] **Step 3: Commit**

```bash
git add apps/api/test
git commit -m "test(rls): supplier isolation integration test"
```

---

## Task 14: React app skeleton (Vite + Tailwind + shadcn + TanStack Router)

**Files:**
- Create: `apps/web/package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.cjs`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Crea apps/web/package.json**

```json
{
  "name": "@soulmovie/web",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "test": "vitest run"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.4.0",
    "@soulmovie/shared": "workspace:*",
    "@tanstack/react-query": "^5.40.0",
    "@tanstack/react-router": "^1.34.0",
    "axios": "^1.7.2",
    "clsx": "^2.1.1",
    "lucide-react": "^0.395.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.51.5",
    "tailwind-merge": "^2.3.0",
    "zod": "^3.23.8",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@tanstack/router-vite-plugin": "^1.34.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.2.13",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Crea config Vite + Tailwind + tsconfig**

File `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'node:path';

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
```

File `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

File `postcss.config.cjs`:

```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

File `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

File `index.html`:

```html
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Soulmovie</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

File `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Crea axios client + auth store**

File `src/lib/api.ts`:

```typescript
import axios, { AxiosError } from 'axios';
import { useAuthStore } from './auth-store';

export const api = axios.create({ baseURL: '/api/v1', withCredentials: true });

api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().accessToken;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let refreshing: Promise<void> | null = null;
api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as any;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing ??= (async () => {
        try {
          const r = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
          useAuthStore.getState().setAuth(r.data.accessToken, r.data.user);
        } catch {
          useAuthStore.getState().clear();
        }
      })().finally(() => { refreshing = null; });
      await refreshing;
      return api(original);
    }
    return Promise.reject(err);
  },
);
```

File `src/lib/auth-store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser { id: string; email: string; role: 'admin' | 'supplier'; supplierId?: string; }

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null, user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    { name: 'sm-auth' },
  ),
);
```

- [ ] **Step 4: Crea root route + login page minimale**

File `src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
export const Route = createRootRoute({ component: () => <Outlet /> });
```

File `src/routes/_public/login.tsx`:

```tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginDto } from '@soulmovie/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export const Route = createFileRoute('/_public/login')({ component: Login });

function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
  });
  const onSubmit = handleSubmit(async (dto) => {
    const r = await api.post('/auth/login', dto);
    setAuth(r.data.accessToken, r.data.user);
    navigate({ to: r.data.user.role === 'admin' ? '/admin' : '/app' });
  });
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Accedi a Soulmovie</h1>
        <div>
          <label className="block text-sm">Email</label>
          <input {...register('email')} className="w-full border rounded px-3 py-2" />
          {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input type="password" {...register('password')} className="w-full border rounded px-3 py-2" />
        </div>
        <button disabled={isSubmitting} className="w-full bg-black text-white rounded py-2">Accedi</button>
        <p className="text-sm text-center">
          Non hai un account? <Link to="/register" className="underline">Registrati</Link>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Crea route shells admin/supplier con guard**

File `src/routes/_admin/__layout.tsx`:

```tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/auth-store';

export const Route = createFileRoute('/_admin')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) throw redirect({ to: '/login' });
    if (user.role !== 'admin') throw redirect({ to: '/app' });
  },
  component: () => (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-white px-6 py-3">Soulmovie · Admin</header>
      <main className="p-6"><Outlet /></main>
    </div>
  ),
});
```

File `src/routes/_admin/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_admin/')({ component: () => <h1 className="text-xl">Admin Dashboard (placeholder)</h1> });
```

Equivalenti per `_supplier`:

File `src/routes/_supplier/__layout.tsx`:

```tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/auth-store';

export const Route = createFileRoute('/_supplier')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) throw redirect({ to: '/login' });
    if (user.role !== 'supplier') throw redirect({ to: '/admin' });
  },
  component: () => (
    <div className="min-h-screen">
      <header className="bg-cyan-700 text-white px-6 py-3">Soulmovie · Area Fornitore</header>
      <main className="p-6"><Outlet /></main>
    </div>
  ),
});
```

File `src/routes/_supplier/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_supplier/')({ component: () => <h1 className="text-xl">Area fornitore (placeholder)</h1> });
```

- [ ] **Step 6: Crea main.tsx + App con router + query client**

File `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen'; // generato da TanStack Router plugin
import './index.css';

const router = createRouter({ routeTree });
const qc = new QueryClient();

declare module '@tanstack/react-router' {
  interface Register { router: typeof router; }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

(Lo `routeTree.gen.ts` viene generato automaticamente al primo `vite dev` dal plugin TanStackRouterVite.)

- [ ] **Step 7: Crea pagine register/verify-email/forgot-password/reset-password/accept-invite**

Per ognuna stessa struttura della login con form+zodResolver+chiamata API. Codice di esempio per `register.tsx`:

```tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSelfSchema, RegisterSelfDto } from '@soulmovie/shared';
import { api } from '@/lib/api';

export const Route = createFileRoute('/_public/register')({ component: Register });

function Register() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterSelfDto>({ resolver: zodResolver(registerSelfSchema) });
  const onSubmit = handleSubmit(async (dto) => {
    await api.post('/auth/register/self', dto);
    navigate({ to: '/login', search: { registered: 'true' } as any });
  });
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Registra la tua azienda</h1>
        <input {...register('ragioneSociale')} placeholder="Ragione sociale" className="w-full border rounded px-3 py-2" />
        {errors.ragioneSociale && <p className="text-red-600 text-sm">{errors.ragioneSociale.message}</p>}
        <input {...register('email')} placeholder="Email" className="w-full border rounded px-3 py-2" />
        {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
        <input type="password" {...register('password')} placeholder="Password" className="w-full border rounded px-3 py-2" />
        {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
        <button disabled={isSubmitting} className="w-full bg-black text-white rounded py-2">Registrati</button>
        <p className="text-sm text-center">
          Hai già un account? <Link to="/login" className="underline">Accedi</Link>
        </p>
      </form>
    </div>
  );
}
```

Pagine analoghe:
- `verify-email.tsx`: legge `?token=...`, chiama `GET /auth/verify-email?token=...`, mostra "Email verificata, vai al login"
- `forgot-password.tsx`: form email → `POST /auth/forgot-password` → messaggio "Se l'email esiste, ti abbiamo mandato un link"
- `reset-password.tsx`: legge token da query, form nuova password → `POST /auth/reset-password`
- `accept-invite.tsx`: legge token da query, form set password → `POST /auth/accept-invite`

- [ ] **Step 8: Avvia FE e testa flusso**

```bash
pnpm --filter @soulmovie/web dev
```

Apri http://localhost:5173/login → tenta login con bootstrap admin → arrivi su `/admin` con header "Soulmovie · Admin".

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): React app with auth flows and role-guarded layouts"
```

---

## Task 15: Global exception filter (formato errore uniforme)

**Files:**
- Create: `apps/api/src/common/filters/all-exceptions.filter.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Crea filter**

File `src/common/filters/all-exceptions.filter.ts`:

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ErrorCodes } from '@soulmovie/shared';
import { v4 as uuid } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly log = new Logger(AllExceptionsFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const traceId = ctx.getRequest().headers['x-request-id'] ?? uuid();

    if (exception instanceof HttpException) {
      const r: any = exception.getResponse();
      const code = r?.error?.code ?? 'HTTP_ERROR';
      const message = r?.error?.message ?? exception.message;
      return res.status(exception.getStatus()).json({ error: { code, message, details: r?.error?.details, traceId } });
    }
    this.log.error('Unhandled', exception);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Errore interno', traceId },
    });
  }
}
```

- [ ] **Step 2: Registra filter globalmente in main.ts**

```typescript
app.useGlobalFilters(new AllExceptionsFilter());
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): uniform error format filter"
```

---

## Task 16: Health check + smoke E2E

**Files:**
- Create: `apps/api/src/modules/health/health.controller.ts`, `health.module.ts`

- [ ] **Step 1: Crea endpoint /health**

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('health')
export class HealthController {
  @Public() @Get() check() { return { status: 'ok', timestamp: new Date().toISOString() }; }
}
```

Aggiungi `HealthModule` agli imports di `AppModule`.

- [ ] **Step 2: Smoke E2E manuale completo**

```bash
# 1. ferma tutto, ripulisci DB
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d

# 2. migrate + seed
pnpm db:migrate
pnpm db:seed

# 3. avvia api e web
pnpm dev
```

Poi:

1. Apri `http://localhost:3000/api/v1/health` → `{ status: 'ok' }`
2. Apri `http://localhost:5173/register` → registra fornitore (es. `forn1@test.com`) → vai su MailHog `http://localhost:8025`, clicca link verify
3. Tenta login fornitore → atteso `AUTH_SUPPLIER_NOT_APPROVED`
4. Login admin (`admin@soulmovie.local` / `AdminPass123!`) → entra in `/admin`
5. Logout admin
6. Apri `http://localhost:5173/forgot-password` con email admin → MailHog → reset link → cambia password → logout → login con nuova → ok

- [ ] **Step 3: Commit**

```bash
git add apps/api
git commit -m "feat(api): health endpoint"
```

---

## Task 17: Worker entrypoint stub + outbox processor base

**Files:**
- Create: `apps/api/src/worker.ts`, `apps/api/src/workers/outbox.processor.ts`, `apps/api/src/workers/worker.module.ts`

- [ ] **Step 1: Crea worker entrypoint**

File `src/worker.ts`:

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './workers/worker.module.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  console.log('worker ready');
}
bootstrap();
```

- [ ] **Step 2: Crea WorkerModule e OutboxProcessor (poll loop)**

File `src/workers/worker.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppTypeOrmModule } from '../infra/typeorm/typeorm.module.js';
import { OutboxProcessor } from './outbox.processor.js';
import configuration from '../config/configuration.js';
import { initializeTransactionalContext } from 'typeorm-transactional';
initializeTransactionalContext();

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] }), AppTypeOrmModule],
  providers: [OutboxProcessor],
})
export class WorkerModule {}
```

File `src/workers/outbox.processor.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class OutboxProcessor implements OnModuleInit {
  private readonly log = new Logger(OutboxProcessor.name);
  constructor(private readonly ds: DataSource) {}

  onModuleInit() { this.loop().catch((e) => this.log.error(e)); }

  private async loop() {
    while (true) {
      try {
        await this.ds.transaction(async (em) => {
          const rows = await em.query(
            `SELECT id, aggregate_type, aggregate_id, event_type, payload
             FROM outbox_events WHERE processed_at IS NULL
             ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`,
          );
          if (rows.length === 0) return;
          // Fase 1: stub log. Fase 5+ aggiunge l'indicizzazione su Elastic.
          for (const r of rows) {
            this.log.log(`[outbox] ${r.event_type} ${r.aggregate_type}=${r.aggregate_id}`);
            await em.query(`UPDATE outbox_events SET processed_at = now() WHERE id = $1`, [r.id]);
          }
        });
      } catch (e) {
        this.log.error('outbox loop error', e as Error);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
```

- [ ] **Step 3: Aggiungi script start:worker e prova**

In `apps/api/package.json`, già presente `start:worker`. Aggiungi a root `package.json`:

```json
"dev:worker": "pnpm --filter @soulmovie/api start:worker"
```

In una seconda finestra:

```bash
pnpm --filter @soulmovie/api build
pnpm dev:worker
```

Expected: log `worker ready`. Inserisci manualmente una riga in `outbox_events` via psql e verifica che il worker la marchi come processata in pochi secondi.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src
git commit -m "feat(worker): worker entrypoint and outbox poll loop"
```

---

## Task 18: Self-review e verifica fase

- [ ] **Step 1: Verifica copertura spec Fase 1**

Ri-leggi spec §9 fase 1: monorepo ✅, docker-compose ✅, migrations TypeORM ✅, seed (admin + base) ✅, RLS base ✅, auth (register self ✅, invite ✅, login ✅, refresh ✅, reset ✅).

- [ ] **Step 2: Smoke E2E completo finale (Task 16 step 2 ripetuto)**

Documenta nel README l'avvio dev (cmd, ordine).

- [ ] **Step 3: Aggiorna README con istruzioni dev complete**

Aggiungi sezioni: prerequisiti, setup env (`cp .env.example .env`), avvio infra, migrate, seed, dev, account bootstrap admin, link MailHog/MinIO console.

- [ ] **Step 4: Commit finale Fase 1**

```bash
git add README.md
git commit -m "docs: developer guide for phase 1"
git tag phase-1-foundations
```

---

## Note di consegna fase 1

A questo punto hai un'app navigabile dove:
- Il bootstrap admin può fare login e accedere a `/admin` (placeholder)
- Un fornitore può registrarsi self-service, verificare email, e (dopo approvazione manuale via UPDATE diretto al DB in attesa di Task 19+ in Fase 2) loggarsi
- Un admin può invitare un fornitore (via API)
- Reset password completo funzionante
- Stack docker-compose tutto funzionante
- RLS attiva e testata

**Prossima fase (da pianificare in piano separato):** Fase 2 — Tab "Società e contatti" + "Impostazioni personali" + UI navigation completa + endpoint approva-fornitore admin.
