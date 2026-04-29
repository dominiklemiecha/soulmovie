#!/bin/sh
set -e
cd /workspace
if [ ! -f node_modules/.soulmovie-installed ]; then
  echo "[entrypoint] installing pnpm workspace deps (first run)..."
  pnpm install --frozen-lockfile=false
  touch node_modules/.soulmovie-installed
fi
echo "[entrypoint] building @soulmovie/shared..."
pnpm --filter @soulmovie/shared build
exec "$@"
