#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "==> Deploying in: $PROJECT_DIR"

# 1. Bootstrap .env if missing (first-time deploy).
if [ ! -f ".env" ]; then
  echo "==> .env not found — creating from .env.example with auto-generated secrets."
  cp .env.example .env

  # Generate a strong AUTH_SECRET (base64, 48 bytes ≈ 64 chars).
  if command -v openssl >/dev/null 2>&1; then
    GEN_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  else
    GEN_SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '\n')"
  fi
  # Generate a strong admin password (24 chars, URL-safe).
  if command -v openssl >/dev/null 2>&1; then
    GEN_ADMIN_PW="$(openssl rand -base64 18 | tr -d '\n=+/' | cut -c1-24)"
  else
    GEN_ADMIN_PW="$(head -c 32 /dev/urandom | base64 | tr -d '\n=+/' | cut -c1-24)"
  fi

  # For Docker networking, override DATABASE_URL to point to the "db" service.
  {
    echo "DATABASE_URL=postgresql://postgres:postgres@db:5432/smartwarehouse?schema=public"
    echo "AUTH_SECRET=${GEN_SECRET}"
    echo "ADMIN_EMAIL=admin@example.com"
    echo "ADMIN_PASSWORD=${GEN_ADMIN_PW}"
  } > .env

  echo ""
  echo "============================================================"
  echo " First-time setup — SAVE THESE ADMIN CREDENTIALS NOW:"
  echo "   Email:    admin@example.com"
  echo "   Password: ${GEN_ADMIN_PW}"
  echo "============================================================"
  echo ""
fi

# 2. Ensure AUTH_SECRET is present and non-placeholder (auto-fix on upgrades).
if ! grep -q '^AUTH_SECRET=' .env || grep -q '^AUTH_SECRET=change-me' .env; then
  echo "==> Injecting strong AUTH_SECRET into .env"
  if command -v openssl >/dev/null 2>&1; then
    GEN_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  else
    GEN_SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '\n')"
  fi
  # Remove any old AUTH_SECRET lines and append the new one.
  grep -v '^AUTH_SECRET=' .env > .env.tmp || true
  echo "AUTH_SECRET=${GEN_SECRET}" >> .env.tmp
  mv .env.tmp .env
fi

# 3. Rebuild and restart containers.
echo "==> Rebuilding containers"
docker compose down
docker compose up -d --build

# 4. Wait for the app container to be running.
echo "==> Waiting for services to start"
sleep 8

# 5. Apply database migrations.
echo "==> Running Prisma migrations"
docker compose exec -T app npx prisma migrate deploy

# 6. Seed (idempotent: only creates data if missing).
echo "==> Seeding database (admin user + sample data if empty)"
docker compose exec -T app npm run db:seed || true

# 7. Status + health check.
echo "==> Containers:"
docker compose ps

echo "==> Health check:"
if curl -fsS http://localhost/api/warehouse >/dev/null; then
  echo "OK: app responds through nginx"
else
  echo "WARNING: app did not respond on port 80 — check 'docker compose logs app nginx'"
fi

echo "==> Deploy finished."
