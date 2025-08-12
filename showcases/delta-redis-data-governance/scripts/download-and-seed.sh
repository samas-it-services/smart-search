#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

API="http://localhost:${PORT_DELTA_API:-8000}"
DATASET=${1:-healthcare}
SIZE=${2:-tiny}
ROLE=${3:-analyst}
FORCE=${4:-true}

# Trigger live download (within container tmp) and seeding
curl -sS -X POST "$API/seed" \
  -H 'Content-Type: application/json' \
  -d "{\"dataset\":\"$DATASET\",\"size\":\"$SIZE\",\"role\":\"$ROLE\",\"forceDownload\":$FORCE}" | tee /tmp/seed.json

JOB_ID=$(cat /tmp/seed.json | sed -E 's/.*"jobId":"([^"]+)".*/\1/')

# Poll progress
while true; do
  RES=$(curl -sS "$API/progress?jobId=$JOB_ID")
  STATUS=$(echo "$RES" | sed -E 's/.*"status":"([^"]+)".*/\1/') || STATUS="running"
  PCT=$(echo "$RES" | sed -E 's/.*"pct":([0-9]+).*/\1/') || PCT=0
  echo "status=$STATUS pct=$PCT"
  [ "$STATUS" = "completed" ] && break
  sleep 1
done

# Quick search sanity check
curl -sS "$API/search?q=asthma&page=1&pageSize=5&dataset=$DATASET" \
  -H "X-User-Role: $ROLE" -H 'X-User-Context: {"allowed_regions":["NE","SW"],"id":"demo"}' | jq '.total, (.items|length)' || true

