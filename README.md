# Soulmovie

Gestionale fornitori (B2B) — supplier management con area admin e area fornitore.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + TanStack Router/Query + Tailwind
- **Backend**: NestJS 10 + TypeORM + Postgres 16 + RLS
- **Infra**: Redis, Elasticsearch 8, MinIO (S3 compatible), PgBouncer (transaction mode), MailHog (dev SMTP)
- **Container**: Docker Compose

## Prerequisiti

- Node 20+ (testato anche con Node 24)
- pnpm 9+ (`npm install -g pnpm@9`)
- Docker Desktop + Docker Compose

## Setup dev

```bash
# 1. Copia env template
cp .env.example .env

# 2. Installa dipendenze monorepo
pnpm install

# 3. Avvia stack docker
pnpm infra:up

# 4. Verifica container
docker compose -f infra/docker-compose.yml --env-file .env ps

# 5. Esegui migrations
pnpm db:migrate

# 6. Crea bootstrap admin
pnpm db:seed

# 7. Avvia api + web in dev parallel
pnpm dev
```

## Endpoint dev

- Web: http://localhost:5173
- API: http://localhost:3000/api/v1
- Health: http://localhost:3000/api/v1/health
- MailHog UI: http://localhost:8025
- MinIO console: http://localhost:9001
- Elastic: http://localhost:9200

## Account bootstrap

Default in `.env`:
- email: `admin@soulmovie.local`
- password: `AdminPass123!`

## Smoke test

1. Apri http://localhost:5173/login
2. Login admin -> /admin (dashboard placeholder)
3. Logout
4. /register -> nuovo fornitore
5. MailHog (http://localhost:8025) -> click verify link
6. Login fornitore -> errore "in attesa di approvazione" (atteso)
7. Approvazione manuale via SQL (UI admin nelle fasi successive): `UPDATE suppliers SET approval_status='approved' WHERE id=...`
8. Login fornitore -> /app

## Struttura monorepo

```
soulmovie/
├── apps/
│   ├── api/              # NestJS backend
│   └── web/              # React frontend
├── packages/
│   └── shared/           # tipi + zod schemas condivisi FE/BE
├── infra/
│   ├── docker-compose.yml
│   ├── postgres/init/    # extensions + RLS roles
│   └── pgbouncer/
└── docs/superpowers/
    ├── specs/            # design doc
    └── plans/            # implementation plans per fase
```

## Roadmap fasi

- Fase 1: Fondamenta — auth completa, RLS, stack Docker, shell FE
- Fase 2: Tab "Società e contatti" + "Impostazioni personali" + admin approva fornitore
- Fase 3: Contatti del fornitore (CRUD)
- Fase 4: Categorie merceologiche (albero + picker)
- Fase 5: Certificati (upload MinIO + scadenze + email alert)
- Fase 6: Lista admin con Elasticsearch + KPI dashboard + audit log + export
- Fase 7: SMTP settings UI + tipologie certificati
- Fase 8: Hardening + deploy Dokploy

## Note

- TypeScript strict mode
- Validation: zod schemas condivisi via `packages/shared`
- Auth: JWT access (15min, body) + refresh (7gg, cookie httpOnly+sameSite=strict) con rotation
- RLS: `admin_role` (BYPASSRLS) + `supplier_role` con isolamento `supplier_id` via `SET LOCAL ROLE` per transazione
- PgBouncer transaction mode (compatibile con `SET LOCAL`)
