# Delta Lake + Redis: Data Governance (RLS/CLS) & Masked, Paginated Search

This self-contained showcase demonstrates row-level security (RLS), column-level security (CLS) masking, and paginated search over datasets hydrated into Delta Lake (via delta-rs) with Redis caching.

## Run locally

1. Copy env

```
cp env.example .env
```

2. Start services

```
docker-compose up --build
```

3. Open the UI at `http://localhost:3000` and walk through the stepper.

## What’s included

- Next.js 14 App Router UI with a stepper to select dataset, size, governance, role, validate, hydrate, and search
- Python FastAPI "delta-api" service implementing `/seed`, `/progress`, and `/search` with RLS/CLS enforcement and Redis caching
- BullMQ worker for seeding jobs and progress updates
- Governance YAML per dataset with roles, row filters, and column masks
- Examples in JS and Python
- Examples using `@bilgrami/smart-search` with a custom HTTP provider adapter
- Scripts to run and seed

## Endpoints

- POST `/seed` → enqueue seed job
- GET `/progress?jobId=...` → track job progress
- GET `/search?q=...&page=...&pageSize=...` → paginated search with RLS/CLS and Redis cache

Headers used for enforcement:

- `X-User-Role`: role id
- `X-User-Context`: JSON string with attributes (e.g., allowed regions)

## Governance (YAML DSL)

Roles define:

- `can_edit_policies`
- `row_filter` (predicate compiled server-side)
- `column_masks` (mask functions applied server-side)

See files under `governance/`.

## Scripts

- `scripts/run-showcase.sh` — bring up compose, seed tiny, run examples
- `scripts/seed-*.sh` — seed wrappers for different sizes

### Example: SmartSearch usage (Node)

```
cd examples/js
node -e "require('tsx').run('./smart-search-usage.ts')"  # or run via tsx runner
```

This uses a minimal `DatabaseProvider` adapter that calls the local `delta-api` and feeds results through the `SmartSearch` engine to leverage cache strategies, metrics, and governance integration.

## Notes

- The implementation is engine-agnostic; Delta v4 is primary with room for Parquet/Iceberg extensions.
- Caching key includes dataset, role, query, pagination, policy version, and delta version.


