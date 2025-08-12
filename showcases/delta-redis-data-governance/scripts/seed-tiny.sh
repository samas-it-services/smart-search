#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
curl -s -X POST "http://localhost:${PORT_DELTA_API:-8000}/seed" -H 'Content-Type: application/json' -d '{"dataset":"healthcare","size":"tiny","role":"clinician"}'

