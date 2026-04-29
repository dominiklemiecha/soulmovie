#!/bin/bash
# Esporta lo stato dev (DB postgres + bucket MinIO) per importarlo in produzione.
# Output in ./dumps/<timestamp>/

set -e
ts=$(date +%Y%m%d-%H%M%S)
out="./dumps/$ts"
mkdir -p "$out"

echo "==> Dump Postgres → $out/db.sql"
docker exec soulmovie-postgres-1 pg_dump -U soulmovie_app -d soulmovie --no-owner --no-acl > "$out/db.sql"

echo "==> Dump MinIO bucket → $out/minio.tar"
docker run --rm --network soulmovie_default \
  -v "$(pwd)/$out:/dump" \
  minio/mc:latest \
  /bin/sh -c "mc alias set local http://minio:9000 minioadmin minioadmin && mc mirror local/soulmovie /dump/minio --quiet" || \
  echo "(MinIO mirror saltato — bucket vuoto o errore)"

echo "==> Pacchetto pronto in: $out"
echo
echo "Per ripristinare in produzione:"
echo "  1. Carica db.sql sul server"
echo "  2. docker exec -i soulmovie-prod-postgres-1 psql -U soulmovie_app -d soulmovie < db.sql"
echo "  3. (per i file MinIO: usa mc mirror in senso inverso)"
