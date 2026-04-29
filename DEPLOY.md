# Deploy Soulmovie su Dokploy

## 0. Prerequisiti
- Dokploy installato a `94.130.64.59:3000`
- Domini puntati al server (record A/CNAME):
  - `soulmovie.connecteed.com` → IP server
  - `s3-soulmovie.connecteed.com` → IP server (per i file caricati su MinIO)
- Letsencrypt configurato in Dokploy (Traefik resolver `letsencrypt`)

## 1. Build e push delle immagini Docker

Sul tuo PC dev (con docker locale):

```bash
# Tag con la tua registry o un image registry pubblico (es. ghcr.io/tuonome/soulmovie-api)
docker build -t ghcr.io/TUONOME/soulmovie-api:1.0 -f apps/api/Dockerfile .
docker build -t ghcr.io/TUONOME/soulmovie-web:1.0 -f apps/web/Dockerfile .
docker push ghcr.io/TUONOME/soulmovie-api:1.0
docker push ghcr.io/TUONOME/soulmovie-web:1.0
```

Se non vuoi una registry, in alternativa puoi:
- usare `docker save` + scp e `docker load` sul server
- oppure clonare il repo sul server e buildare lì

## 2. Crea il progetto su Dokploy

1. Login su `http://94.130.64.59:3000/dashboard/projects`
2. **+ New Project** → "soulmovie"
3. Aggiungi un **Compose** stack
4. Nome: `soulmovie-prod`
5. Source: incolla `infra/docker-compose.prod.yml` (o collegalo a Git)

## 3. Configura le variabili env

In Dokploy → tab **Environment**, copia il contenuto di `infra/.env.prod.example` sostituendo i valori:

```env
WEB_DOMAIN=soulmovie.connecteed.com
S3_DOMAIN=s3-soulmovie.connecteed.com
POSTGRES_USER=soulmovie_app
POSTGRES_PASSWORD=<genera>
POSTGRES_DB=soulmovie
JWT_ACCESS_SECRET=<genera 64 char random>
JWT_REFRESH_SECRET=<genera 64 char random diverso>
SETTINGS_ENCRYPTION_KEY=<genera 64 hex char>
MINIO_ROOT_USER=soulmovie_admin
MINIO_ROOT_PASSWORD=<genera>
MINIO_BUCKET=soulmovie
BOOTSTRAP_ADMIN_EMAIL=admin@soulmovie.connecteed.com
BOOTSTRAP_ADMIN_PASSWORD=<password iniziale>
IMAGE_API=ghcr.io/TUONOME/soulmovie-api:1.0
IMAGE_WEB=ghcr.io/TUONOME/soulmovie-web:1.0
```

Comandi rapidi per generare i secret:
```bash
openssl rand -hex 32                # JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
openssl rand -hex 32                # SETTINGS_ENCRYPTION_KEY (64 char hex)
openssl rand -base64 24             # POSTGRES_PASSWORD, MINIO_ROOT_PASSWORD
```

## 4. Deploy

In Dokploy click **Deploy**. Si avvieranno in ordine:
- postgres → pgbouncer
- redis, minio
- **api-migrate** (gira una volta, applica le migration)
- api → web

Verifica health: `https://soulmovie.connecteed.com` deve aprire la login page.

## 5. Bootstrap admin

Dopo il primo deploy (DB vuoto + migration applicate):

```bash
# SSH sul server, oppure usa il terminale Dokploy del container api
docker exec -it soulmovie-prod-api-1 \
  node /app/node_modules/typeorm/cli.js exec -- /app/apps/api/dist/seeds/bootstrap-admin.js
```

Oppure più semplice se hai dati dev da migrare → vai al passo 6.

## 6. Importa i dati di test dal dev (opzionale)

Sul tuo PC dev:
```bash
bash scripts/dump-dev.sh
# crea ./dumps/<timestamp>/db.sql + (opzionale) ./dumps/<timestamp>/minio/
```

Carica `db.sql` sul server e poi:
```bash
docker exec -i soulmovie-prod-postgres-1 \
  psql -U soulmovie_app -d soulmovie < /path/al/db.sql
```

Per i file caricati su MinIO (certificati esistenti):
```bash
# Sul server, dentro il container minio-client (mc)
docker run --rm --network soulmovie-prod_default \
  -v /path/al/dumps/<ts>/minio:/dump \
  minio/mc:latest \
  /bin/sh -c "mc alias set p http://minio:9000 <MINIO_ROOT_USER> <MINIO_ROOT_PASSWORD> && mc mirror /dump p/soulmovie"
```

## 7. SMTP (per inviare email reali)

Dopo il deploy, login admin → menu **Configurazione SMTP** → inserisci credenziali del provider (Brevo, SendGrid, AWS SES, ecc.) → salva → invia email di test.

## 8. Verifica finale

- [ ] Login con admin (credenziali del passo 5 o quelle migrate dal dev)
- [ ] `/admin` → KPI popolati
- [ ] Registra fornitore di prova → riceve email su SMTP configurato (passo 7)
- [ ] Prova upload certificato (verifica che il PUT pre-signed verso `https://s3-soulmovie.connecteed.com` funzioni dal browser)
- [ ] HTTPS attivo sui due domini con cert Letsencrypt valido

## Aggiornamenti successivi

Per rilasciare una nuova versione:
1. Build + push nuove immagini con un nuovo tag (es. `1.1`)
2. Aggiorna `IMAGE_API` / `IMAGE_WEB` in Dokploy → **Redeploy**
3. Le migration partono automaticamente al riavvio (servizio `api-migrate`)
