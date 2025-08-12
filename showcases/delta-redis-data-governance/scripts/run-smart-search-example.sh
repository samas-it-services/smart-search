#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required (bundled with Node.js)" >&2
  exit 1
fi

echo "Running SmartSearch example against delta-api..."
npx --yes tsx ./examples/js/smart-search-usage.ts | cat

