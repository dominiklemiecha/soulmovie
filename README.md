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
