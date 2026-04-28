# Soulmovie — Gestionale Fornitori

**Spec di design** — 2026-04-28
**Stato:** in revisione utente

---

## 1. Obiettivo e contesto

Costruire un gestionale fornitori multi-utente ispirato al portale Mediaset/SynerTrade (vedi screenshot in `1.png`–`6.png` nella root del repo).

**Due aree distinte nella stessa app:**
- **Area fornitore** (`/app/*`): un account utente = un fornitore. Si registra, fa login, gestisce i propri dati anagrafici, contatti aziendali, categorie merceologiche di riferimento e certificati con upload documenti.
- **Area admin** (`/admin/*`): unico ruolo amministrativo che governa tutto — vede e modifica qualsiasi fornitore, gestisce le tassonomie (categorie, tipologie certificati), configura SMTP a runtime, vede audit log e KPI dashboard.

Stack imposto dal committente: React + TypeScript + Vite frontend, NestJS + TypeORM backend, PostgreSQL con Row-Level Security, Redis, Elasticsearch, Docker, PgBouncer, MinIO per object storage. Deploy su Dokploy.

## 2. Scope

### 2.1 Tab funzionali nell'MVP (lato fornitore)

1. **Società e contatti** — anagrafica azienda + dati identificativi/valuta
2. **Impostazioni personali** — preferenze account utente (cambio password, email)
3. **Contatti del fornitore** — anagrafica multipla contatti aziendali (1:N per fornitore)
4. **Categorie merceologiche** — picker ad albero per assegnarsi categorie
5. **Certificati** — CRUD certificati con upload documento, scadenze, alert email automatici

**Fuori scope MVP** (rimandate): "PAC family", "Informazioni aggiuntive". L'app deve essere strutturata per accoglierle in futuro senza riprogettazione.

### 2.2 Funzionalità lato admin

- CRUD completo su tutti i fornitori e relative entità (vista trasversale, no isolamento)
- Lista fornitori con ricerca full-text (Elasticsearch) e filtri (categoria, scadenze certificati, stato approvazione)
- Gestione tassonomia categorie merceologiche ad albero (CRUD nodi, sposta, attiva/disattiva)
- Gestione tipologie certificati (lista enum con `requires_expiry`)
- Pannello impostazioni SMTP modificabile a runtime (host, port, user, password, from, TLS) — credenziali cifrate AES-256-GCM in DB
- Approvazione fornitori registrati in self-service
- Invito di nuovi fornitori (email + ragione sociale → email con link attivazione, fornitore pre-approvato)
- Export Excel/CSV lista fornitori e lista certificati con filtri
- Audit log consultabile (chi/cosa/quando/before-after)
- Dashboard KPI in home admin: totale fornitori, fornitori in attesa di approvazione, certificati in scadenza nei prossimi 7/30/60gg, certificati scaduti, fornitori senza categorie

### 2.3 Lingua

Italiano only. Struttura i18n predisposta (file `src/i18n/it.json`) per facilitare aggiunta inglese in futuro, ma nessuna traduzione fornita nell'MVP.

## 3. Architettura

### 3.1 Topologia container (8 servizi + Traefik gestito da Dokploy)

| Container | Tecnologia | Ruolo |
|---|---|---|
| `web` | Nginx static (build Vite) | SPA React, serve asset compilati |
| `api` | NestJS 10 / Node 20 | API HTTP, controller + service + repository |
| `worker` | NestJS (stessa image di api, entrypoint `worker.ts`) | BullMQ consumer: outbox→Elastic, email, scan scadenze, export Excel |
| `postgres` | Postgres 16 | DB principale, RLS abilitata |
| `pgbouncer` | PgBouncer (transaction mode) | Connection pool davanti a Postgres |
| `redis` | Redis 7 | BullMQ + cache + rate limiting |
| `elastic` | Elasticsearch 8 | Indice `suppliers` per ricerca admin |
| `minio` | MinIO | Object storage S3-compatible per documenti |

`worker` condivide la stessa Docker image dell'`api` con entrypoint diverso, per ridurre superficie di build/manutenzione.

SMTP non è containerizzato: è esterno, configurato a runtime dal pannello admin.

### 3.2 Struttura monorepo (pnpm workspaces)

```
soulmovie/
├── apps/
│   ├── web/                      # React 18 + Vite + TS + shadcn/ui + Tailwind
│   │   ├── src/
│   │   │   ├── routes/           # TanStack Router (file-based)
│   │   │   │   ├── _public/      # /login, /register, /reset-password, /verify-email
│   │   │   │   ├── _admin/       # /admin/* (guard ruolo admin)
│   │   │   │   └── _supplier/    # /app/* (guard ruolo supplier)
│   │   │   ├── features/         # 1 cartella per dominio
│   │   │   ├── components/ui/    # shadcn copy-paste
│   │   │   ├── lib/              # api client, auth store, query client
│   │   │   └── i18n/it.json
│   │   ├── Dockerfile            # multi-stage: node-build → nginx-static
│   │   └── nginx.conf
│   └── api/                      # NestJS
│       ├── src/
│       │   ├── modules/          # auth, users, suppliers, contacts, categories,
│       │   │                     # certificates, settings, audit, search, mail, export
│       │   ├── common/           # guards, interceptors, filters, decorators
│       │   ├── infra/            # typeorm, redis, elastic, minio, mail, outbox
│       │   ├── workers/          # processors BullMQ
│       │   ├── main.ts           # entrypoint API
│       │   └── worker.ts         # entrypoint worker
│       ├── migrations/
│       ├── seeds/
│       └── Dockerfile
├── packages/
│   └── shared/                   # tipi DTO + zod schemas + enum (Role, CertStatus, ...)
├── infra/
│   ├── docker-compose.yml        # dev locale
│   ├── docker-compose.prod.yml   # override per Dokploy
│   ├── pgbouncer/
│   └── postgres/init/            # crea ruoli supplier_role/admin_role + estensioni
├── pnpm-workspace.yaml
├── package.json
├── .env.example
└── README.md
```

### 3.3 Layering modulo NestJS

Ogni modulo ha layer netti: `controller` (HTTP) → `service` (business logic) → `repository` (TypeORM, unico ad accedere al DB) → `entity`. Side effect (audit log, indicizzazione Elastic) avvengono via **pattern outbox transazionale**: il service scrive un record in `outbox_events` nella stessa transazione del dato; un worker poll legge la outbox e propaga.

### 3.4 Stack frontend

- **Routing**: TanStack Router (type-safe, file-based)
- **Data fetching**: TanStack Query (cache, mutation, optimistic updates)
- **Form**: react-hook-form + zod resolver (zod schemas condivisi via `packages/shared`)
- **UI**: shadcn/ui + Tailwind CSS (componenti copy-paste, totalmente personalizzabili)
- **Tabelle**: TanStack Table (per lista fornitori, certificati, audit log)
- **HTTP client**: axios con interceptor che aggiunge access token e gestisce refresh automatico

## 4. Data model

### 4.1 Tabelle

```
users
  id            uuid pk default gen_random_uuid()
  email         citext unique not null
  password_hash text not null
  role          enum('admin','supplier') not null
  status        enum('invited','pending_email','active','disabled') not null
  email_verified_at timestamptz null
  supplier_id   uuid null fk → suppliers(id)  -- nullable per admin
  last_login_at timestamptz null
  created_at, updated_at

suppliers
  id                  uuid pk
  ragione_sociale     text not null
  paese               text not null default 'IT'
  indirizzo, cap, citta, provincia text
  sito_web, email_aziendale, pec, telefono text
  natura_giuridica    text
  codice_fiscale      text unique null
  partita_iva         text unique null
  iban                text
  valuta              text default 'EUR'
  gruppo_iva          text
  registration_source enum('self','invite') not null
  approval_status     enum('pending','approved','rejected') not null default 'pending'
  approved_at         timestamptz null
  approved_by         uuid null fk → users(id)
  created_at, updated_at

supplier_contacts
  id           uuid pk
  supplier_id  uuid not null fk → suppliers(id) on delete cascade
  nome, cognome, ruolo, email, telefono, cellulare text
  is_main      bool not null default false
  created_at, updated_at
  -- vincolo: massimo un is_main=true per supplier_id (partial unique index)

categories
  id           uuid pk
  code         text unique not null   -- es "PT", "SVID000093"
  name         text not null
  parent_id    uuid null fk → categories(id) on delete restrict
  active       bool not null default true
  order_index  int not null default 0
  created_at, updated_at
  -- INDEX (parent_id, order_index)

supplier_categories
  supplier_id          uuid not null fk → suppliers(id) on delete cascade
  category_id          uuid not null fk → categories(id) on delete restrict
  include_subelements  bool not null default true
  assigned_at          timestamptz default now()
  PRIMARY KEY (supplier_id, category_id)

certificate_types
  id              uuid pk
  code            text unique not null
  name            text not null
  requires_expiry bool not null default true
  active          bool not null default true

certificates
  id                  uuid pk
  supplier_id         uuid not null fk → suppliers(id) on delete cascade
  type_id             uuid not null fk → certificate_types(id) on delete restrict
  numero              text
  data_emissione      date
  data_scadenza       date null  -- nullable se requires_expiry=false
  emittente, ambito   text
  descrizione         text
  document_object_key text not null  -- path MinIO
  document_filename   text not null
  document_mime       text not null
  document_size       bigint not null
  last_notified_at    timestamptz null  -- per evitare re-notify scadenze
  notified_thresholds int[] default '{}' -- es [60,30,7,0] segnati come notificati
  created_at, updated_at
  -- INDEX (supplier_id, data_scadenza)

system_settings
  key             text pk        -- es 'smtp.host', 'smtp.password'
  value_encrypted bytea not null -- AES-256-GCM
  updated_by      uuid fk → users(id)
  updated_at      timestamptz

audit_log
  id           uuid pk
  user_id      uuid null fk → users(id)  -- null per azioni di sistema
  supplier_id  uuid null
  action       text not null     -- es 'supplier.update', 'certificate.create'
  entity_type  text not null
  entity_id    uuid null
  before       jsonb null
  after        jsonb null
  ip           inet null
  user_agent   text null
  created_at   timestamptz default now()
  -- INDEX (entity_type, entity_id, created_at), (user_id, created_at)
  -- nessuna policy DELETE/UPDATE → append-only

outbox_events
  id              uuid pk
  aggregate_type  text not null  -- es 'supplier'
  aggregate_id    uuid not null
  event_type      text not null  -- es 'supplier.upserted', 'supplier.deleted'
  payload         jsonb not null
  created_at      timestamptz default now()
  processed_at    timestamptz null
  -- INDEX (processed_at, created_at) WHERE processed_at IS NULL

refresh_tokens
  id            uuid pk
  user_id       uuid not null fk → users(id) on delete cascade
  token_hash    text not null unique  -- sha256
  family_id     uuid not null  -- per rilevamento riuso
  expires_at    timestamptz not null
  used_at       timestamptz null
  revoked_at    timestamptz null
  ip            inet, user_agent text
  created_at    timestamptz

password_reset_tokens, email_verification_tokens, invite_tokens
  -- struttura simile a refresh_tokens, expires_at + used_at
```

### 4.2 Row-Level Security

Ruoli DB:
- `admin_role` con `BYPASSRLS` (vede tutto)
- `supplier_role` con RLS attiva (isolamento per `supplier_id`)

NestJS si connette al DB come ruolo applicativo `soulmovie_app` (no superuser, no BYPASSRLS). All'inizio di ogni transazione richiesta, un interceptor esegue:

```sql
SET LOCAL ROLE supplier_role;  -- o admin_role
SET LOCAL app.current_supplier_id = '<uuid>';  -- solo se supplier
SET LOCAL app.current_user_id = '<uuid>';
```

Esempio policy:

```sql
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_isolation ON certificates
  FOR ALL TO supplier_role
  USING (supplier_id = current_setting('app.current_supplier_id')::uuid)
  WITH CHECK (supplier_id = current_setting('app.current_supplier_id')::uuid);
```

PgBouncer in **transaction mode** è compatibile perché `SET LOCAL` muore alla fine della transazione (no leak tra connessioni riusate).

### 4.3 Indice Elasticsearch

**Indice `suppliers`** con documenti denormalizzati:

```json
{
  "_id": "<supplier_uuid>",
  "ragione_sociale": "...",
  "partita_iva": "...",
  "codice_fiscale": "...",
  "citta": "...",
  "approval_status": "approved",
  "categories": [
    { "code": "PT", "name": "Produzioni..." },
    { "code": "SVID000093", "name": "tecnico generico" }
  ],
  "certificates_count": 5,
  "certificates_expiring_30": 1,
  "certificates_expired": 0,
  "next_expiry_date": "2026-06-15",
  "updated_at": "..."
}
```

Aggiornato dal worker via outbox. Tutto il CRUD passa da Postgres; Elastic serve solo per ricerca admin globale e filtri compositi.

### 4.4 Seed iniziale

- 6 categorie root: `PT`, `SG`, `SB`, `ST`, `MG0000007453`, `MG0000008003` (vedi screenshot Mediaset)
- Sotto-nodi visibili nello snippet HTML fornito (`SVID000093`, `SENG000087-099`, `SSTU000077`) come figli di un nodo intermedio dedotto
- Tipologie certificato di base (estratte dalla screenshot 6: "S accreditamento volontario per partecipazione a gara", oltre a tipologie standard ISO 9001/14001/45001 — l'admin completa la lista)
- Primo admin creato da env vars al primo seed: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`

## 5. Flussi chiave

### 5.1 Registrazione self-service

1. Utente compila `/register` (email, password, ragione sociale)
2. `POST /auth/register/self` → in transazione: crea `user(status=pending_email, role=supplier)` + `supplier(approval_status=pending, registration_source=self)`
3. Genera `email_verification_token`, manda email via SMTP configurato
4. Utente clicca link → `GET /auth/verify-email?token=...` → `user.status=active`, `email_verified_at=now()`
5. Admin riceve notifica nella dashboard (KPI "in attesa di approvazione" si incrementa)
6. Admin approva → `supplier.approval_status=approved`. Solo ora il fornitore può loggarsi e accedere all'app
7. Email di benvenuto al fornitore con link login

### 5.2 Invito da admin

1. Admin: form "invita fornitore" (email + ragione sociale)
2. `POST /admin/suppliers/invite` → crea `user(status=invited)` + `supplier(approval_status=approved, registration_source=invite)`
3. Manda email con `invite_token`
4. Fornitore clicca link → form imposta password → `user.status=active` → entra subito (già pre-approvato)

### 5.3 Login

- `POST /auth/login` → verifica password (argon2id), emette JWT access (15min, body) + refresh (7gg, cookie httpOnly+secure+sameSite=strict)
- Refresh: `POST /auth/refresh` (cookie automatico) → emette nuovo access + ruota refresh (rotation con detection riuso)
- Logout: revoca tutti i refresh dell'utente
- Reset password: `POST /auth/forgot-password` → email → `POST /auth/reset-password` con token

### 5.4 Upload certificato (no RAM consumata)

1. Frontend: select file (validazione client: MIME, dimensione max 25 MB)
2. `POST /certificates/upload-url` → backend genera **pre-signed PUT URL** MinIO (validità 5 min)
3. Frontend `PUT` direttamente su MinIO — il file non passa mai dal backend Node, niente streaming, niente RAM
4. Frontend: `POST /certificates` con `object_key` + metadati (tipologia, numero, scadenza, ecc.)
5. Backend: verifica che l'object esista su MinIO, crea record DB, scrive evento outbox in stessa transazione
6. Worker async: scarica object da MinIO, verifica magic bytes (PDF/JPG/PNG/DOCX), se invalido elimina e marca certificato come `invalid`
7. Worker indicizza supplier aggiornato in Elastic

### 5.5 Scan scadenze certificati (cron giornaliero)

- BullMQ scheduled job ogni notte alle 03:00 Europe/Rome
- Query: certificati con `data_scadenza` IN (oggi+7d, oggi+30d, oggi+60d) AND `notified_thresholds` non contiene la soglia, OR `data_scadenza < oggi` AND `0` non in `notified_thresholds`
- Per ogni hit: enqueue job `email.cert-expiry-alert` con destinatario fornitore + admin in CC
- Aggiorna `notified_thresholds` array per evitare re-invio

### 5.6 Outbox → Elastic

- Worker poll-loop ogni 2s con `FOR UPDATE SKIP LOCKED LIMIT 100`
- Per ogni evento `aggregate_type=supplier`: rilegge supplier completo da DB (ragione sociale, categorie, conteggi certificati) e fa `index` su Elastic con `_id=supplier_id`
- Marca `processed_at=now()`. Idempotente: re-elaborare un evento dà lo stesso risultato

### 5.7 Export Excel

1. Admin clicca "Export"
2. `POST /admin/export/suppliers` con filtri → crea job BullMQ, ritorna `job_id`
3. Worker: query streaming Postgres con cursor → scrive xlsx con `exceljs` in tmpfile → upload MinIO con TTL 24h → enqueue email all'admin con link pre-signed
4. Frontend: polling `GET /admin/export/jobs/:id` → quando `status=ready`, mostra link diretto

## 6. Errori, validazione, sicurezza

### 6.1 Validazione

- `packages/shared` espone zod schemas (`supplierCreateSchema`, `certificateCreateSchema`, ecc.)
- Frontend: `react-hook-form` + `@hookform/resolvers/zod`
- Backend: pipe NestJS custom basato su zod (parsing+errori uniformi). **Non si usa class-validator**: una sola fonte di verità per i tipi

### 6.2 Formato errore HTTP

```json
{
  "error": {
    "code": "CERT_FILE_TOO_LARGE",
    "message": "Il file supera la dimensione massima consentita (25 MB)",
    "details": { "maxBytes": 26214400, "actualBytes": 31457280 },
    "traceId": "01HXX..."
  }
}
```

Lista codici machine-readable mantenuta in `packages/shared/src/error-codes.ts`. Frontend mappa code → messaggio user-friendly italiano.

### 6.3 Logging

- Pino con `requestId` (uuid generato dall'interceptor, propagato in header response `x-request-id`)
- Redaction automatica di campi sensibili: `password`, `token`, `*.smtp.password`, `Authorization` header
- Log livello `info` su prod, `debug` su dev

### 6.4 Sicurezza

- Password: argon2id (memory=64MB, iterations=3, parallelism=1)
- Refresh token rotation con rilevamento riuso → revoca intera famiglia (`family_id`)
- Rate limiting login: 5 tentativi/15min per email + 20/min per IP (Redis store)
- Helmet, CORS strict (whitelist domini env-driven)
- File upload: MIME whitelist + magic bytes verification post-upload
- Secret cifrate AES-256-GCM con master key da `SETTINGS_ENCRYPTION_KEY` env
- Audit log append-only: nessuna policy UPDATE/DELETE; rotazione/archiviazione fuori scope MVP
- SQL injection: zero query stringate, solo TypeORM/QueryBuilder parametrizzato

### 6.5 Transazionalità

- Decoratore `@Transactional()` (libreria `typeorm-transactional`) su tutti i metodi service che mutano > 1 tabella
- Outbox event scritto **nella stessa transazione** del dato → atomicità garantita

## 7. Testing

### 7.1 Backend

- **Unit**: Vitest, service layer con repository mockati
- **Integration**: Vitest + testcontainers (Postgres effimero per suite). Test espliciti per:
  - RLS: utente fornitore A non può leggere/scrivere dati fornitore B (verifica che la query restituisca 0 righe)
  - Outbox: event creato in stessa transazione del dato; rollback elimina entrambi
  - Token rotation: riuso refresh revoca famiglia
- **E2E API**: supertest contro `INestApplication` booted con DB testcontainer
- Coverage target: >80% sui service, 100% sulle policy RLS critiche

### 7.2 Frontend

- **Component**: Vitest + Testing Library — form auth, tabella certificati, picker categorie ad albero
- **E2E**: Playwright headless. Golden path:
  1. Self-registration → verify email → admin approves → login → carica certificato → vede in lista con badge scadenza
  2. Admin: invita fornitore → vede in lista → modifica anagrafica → export Excel

### 7.3 CI

- GitHub Actions, 3 job paralleli: `lint`, `test` (con docker-compose Postgres+Redis+MinIO+Elastic), `build`
- Branch protection su `main`, richiede tutti i check verdi

## 8. Deploy

### 8.1 Dev locale

`docker compose up` da root → tutto lo stack su localhost:
- web: `localhost:5173` (vite dev server con HMR)
- api: `localhost:3000` (nest --watch)
- postgres: `localhost:5432`
- pgbouncer: `localhost:6432`
- redis: `localhost:6379`
- elastic: `localhost:9200`
- minio: `localhost:9000` (API), `localhost:9001` (console)

Hot reload via volume bind. Volumi nominati persistenti per dati DB/MinIO/Elastic.

### 8.2 Prod Dokploy

- 1 progetto Dokploy gestisce `docker-compose.prod.yml`
- Traefik (gestito da Dokploy) routa per dominio:
  - `app.<dominio>` → web
  - `api.<dominio>` → api
  - `s3.<dominio>` → minio (opzionale, per accesso pre-signed URL)
- Variabili env iniettate da Dokploy UI: `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SETTINGS_ENCRYPTION_KEY`, `MINIO_ROOT_USER/PASSWORD`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`
- Volumi persistenti: `postgres_data`, `minio_data`, `elastic_data`, `redis_data`
- Health check su tutti i container (HTTP /health per api, pg_isready per postgres, ecc.)

### 8.3 Migrations e seed

- `api-migrate`: init container con stessa image dell'api, comando `npm run db:migrate`. Gira **prima** di api/worker. Idempotente
- `api-seed`: comando manuale `docker compose exec api npm run db:seed` — esegue solo se DB vuoto (controllo idempotente sulla presenza di categorie root)

### 8.4 Backup (out of scope MVP, documentato per v1.1)

- Cron container con `pg_dump` quotidiano + `mc mirror` MinIO bucket → bucket di backup remoto
- Retention 30 giorni

### 8.5 Risorse VPS minime

| Servizio | RAM |
|---|---|
| Postgres | 1 GB |
| Elastic | 1.5 GB (heap 1G) |
| Redis | 256 MB |
| MinIO | 256 MB |
| api | 512 MB |
| worker | 512 MB |
| web (nginx) | 64 MB |
| pgbouncer | 64 MB |
| **Totale app** | **~4.2 GB** |
| OS + Docker overhead | ~3 GB |
| **Raccomandato VPS** | **8 GB RAM, 4 vCPU, 80 GB SSD** |

## 9. Roadmap di consegna (fasi implementative)

L'MVP è "tutte le tab", ma la consegna è in fasi così l'utente vede progressi continui:

1. **Fase 1 — Fondamenta**: monorepo setup, docker-compose dev, migrations TypeORM, seed categorie, RLS base, auth (register self+invite, login, refresh, reset password)
2. **Fase 2 — Area fornitore base**: tab "Società e contatti" + "Impostazioni personali" + layout/navigation
3. **Fase 3 — Contatti del fornitore**: CRUD contatti aziendali multipli
4. **Fase 4 — Categorie merceologiche**: CRUD admin (albero), picker fornitore con modale di selezione (replica UX SynerTrade)
5. **Fase 5 — Certificati**: upload pre-signed MinIO, CRUD, badge scadenze, scan giornaliero + email
6. **Fase 6 — Area admin**: lista fornitori (Elasticsearch), KPI dashboard, audit log viewer, export Excel
7. **Fase 7 — Settings**: pannello SMTP, gestione tipologie certificati
8. **Fase 8 — Hardening + deploy Dokploy**: rate limiting, security audit, deploy prod, smoke test E2E

Ogni fase è un'unità rilasciabile indipendentemente in ambiente dev (con la precedente), così l'utente può testare progressivamente.

## 10. Decisioni rilevanti (registro)

| # | Decisione | Razionale |
|---|---|---|
| 1 | Monorepo pnpm workspaces | Type-safety end-to-end via `packages/shared` |
| 2 | TanStack Router + Query | Type-safe routing e data fetching |
| 3 | shadcn/ui + Tailwind | Componenti customizzabili, no lock-in libreria UI |
| 4 | JWT custom (no Keycloak) | Keycloak overkill per app B2B singolo-tenant |
| 5 | RLS attiva con session var | Difesa in profondità: bug applicativo non leakka dati |
| 6 | PgBouncer transaction mode | Compatibile con `SET LOCAL` per RLS |
| 7 | MinIO self-hosted | Stack 100% self-hosted; API S3 standard per migrazione futura |
| 8 | Pre-signed URL upload | Niente RAM consumata sul backend per file grossi |
| 9 | Outbox pattern per Elastic | Atomicità DB↔index, niente eventi persi |
| 10 | Worker = stessa image API | Riduce manutenzione, codice condiviso |
| 11 | argon2id, no bcrypt | Standard moderno, resistenza memory-hard |
| 12 | zod come unica validazione FE+BE | Una fonte di verità per i tipi |
| 13 | SMTP runtime in DB cifrato | Cambio provider senza redeploy |
| 14 | Italiano only MVP | i18n predisposta ma non popolata |

## 11. Aperti / da decidere durante implementazione

- **Versioning API**: prefisso `/api/v1/`? Decisione minore, default sì
- **Soft delete vs hard delete**: per `suppliers` valutare soft delete (campo `deleted_at`) per preservare audit log. Default: hard delete con audit log che cattura `before` payload
- **Rate limit endpoint upload**: limite numero upload/min per fornitore? Default 30/min
- **Dominio iniziale Dokploy**: da fornire in fase di deploy
