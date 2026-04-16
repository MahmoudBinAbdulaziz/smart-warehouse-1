#!/usr/bin/env sh
set -eu

echo "Pulling latest images and rebuilding containers..."
docker compose down
docker compose up -d --build

echo "Waiting for services..."
sleep 8

echo "Running Prisma migrations..."
docker compose exec app npx prisma migrate deploy

echo "Current containers:"
docker compose ps

echo "Application health check:"
curl -fsS http://localhost/api/warehouse >/dev/null && echo "OK: app responds through nginx"
