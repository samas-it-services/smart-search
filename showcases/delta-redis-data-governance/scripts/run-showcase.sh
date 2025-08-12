#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

cp -n env.example .env || true

# Find a free web port starting at PORT_WEB (default 3000)
DEFAULT_WEB_PORT=${PORT_WEB:-3000}
WEB_PORT=$DEFAULT_WEB_PORT
for try in {0..10}; do
  if ! lsof -i tcp:$WEB_PORT -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  WEB_PORT=$((DEFAULT_WEB_PORT + try + 1))
done
export PORT_WEB=$WEB_PORT
echo "Using web port: $PORT_WEB"

# Persist PORT_WEB into .env for docker compose variable expansion
if [ -f .env ]; then
  grep -v '^PORT_WEB=' .env > .env.tmp || true
else
  : > .env.tmp
fi
echo "PORT_WEB=$PORT_WEB" >> .env.tmp
mv .env.tmp .env

docker-compose up --build -d
docker compose up -d --force-recreate delta-api || true
docker compose up -d --force-recreate web || true

echo "Flushing Redis cache to ensure fresh results..."
docker compose exec -T redis redis-cli FLUSHALL || true

echo "Seeding tiny healthcare..."
curl -s -X POST "http://localhost:${PORT_DELTA_API:-8000}/seed" \
  -H 'Content-Type: application/json' \
  -d '{"dataset":"healthcare","size":"tiny","role":"clinician"}' | tee /tmp/seed.json

JOB_ID=$(cat /tmp/seed.json | sed -E 's/.*"jobId":"([^"]+)".*/\1/')

echo "Waiting for job ${JOB_ID}..."
while true; do
  RES=$(curl -s "http://localhost:${PORT_DELTA_API:-8000}/progress?jobId=${JOB_ID}")
  STATUS=$(echo "$RES" | sed -E 's/.*"status":"([^"]+)".*/\1/')
  PCT=$(echo "$RES" | sed -E 's/.*"pct":([0-9]+).*/\1/')
  echo "status=$STATUS pct=$PCT"
  [ "$STATUS" = "completed" ] && break
  sleep 1
done

echo "Running examples..."
ROLE=analyst node examples/js/search-delta-redis.js || true
./scripts/run-smart-search-example.sh || true

echo "Open the UI at: http://localhost:${PORT_WEB}"

# Basic readiness check for the web UI
for i in {1..30}; do
  if curl -sSf "http://localhost:${PORT_WEB}" >/dev/null 2>&1; then
    echo "Web is reachable at http://localhost:${PORT_WEB}"; break
  fi
  sleep 1
done

echo "Triggering live download + seed (force) for healthcare/tiny..."
chmod +x ./scripts/download-and-seed.sh || true
./scripts/download-and-seed.sh healthcare tiny analyst true || true

