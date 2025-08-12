PROMPT FOR CODE ASSISTANT
You are contributing to https://github.com/samas-it-services/smart-search (NPM package @bilgrami/smart-search).

Create a new, self-contained showcase under:

showcases/delta-redis-data-governance/

Name: “Delta Lake 4 + Redis: Data Governance (RLS/CLS) & Masked, Paginated Search”

This demo must support Delta Lake v4 (open-source delta.io), and include Parquet and Iceberg load examples. Use delta-rs (Python bindings deltalake) for Delta v4 tables; use PyArrow for Parquet and PyIceberg for Iceberg. (Delta Lake 4.0 is the current major OSS release; delta-rs provides Python/Rust APIs. Cite these in the README with links.) 
GitHub
Delta
+1
delta-io.github.io

1) Folder tree (everything inside this folder)
bash
Copy
Edit
showcases/delta-redis-data-governance/
  README.md
  docker-compose.yml
  .env.example

  app/                      # Next.js 14 UI (App Router)
    package.json
    next.config.mjs
    src/
      app/
        layout.tsx
        page.tsx            # stepper: dataset → size → format → governance → role → validate → hydrate → search
        api/
          seed/route.ts
          progress/route.ts
          search/route.ts
      lib/
        client.ts
        governance.ts
      components/
        Stepper.tsx
        GovernanceEditor.tsx
        GovernancePreview.tsx
        MaskLegend.tsx
        SearchTable.tsx
      tests/
        unit/
          governance-preview.test.tsx
          search-table.test.tsx
        e2e/
          seed-and-search.spec.ts     # Playwright (reuse repo root config)

  worker/
    package.json
    src/worker.ts

  python/                   # FastAPI + engines
    pyproject.toml
    app/main.py             # /seed, /progress, /search
    app/delta_engine.py     # Delta v4 via `deltalake` (delta-rs)
    app/parquet_engine.py   # Parquet via PyArrow
    app/iceberg_engine.py   # Iceberg via PyIceberg (file catalog)
    app/governance.py       # compile YAML → predicate + mask plan
    app/seeders/
      healthcare.py
      ecommerce.py
      financial.py
    app/utils/masking.py
    tests/
      test_governance.py
      test_masking.py
      test_rls_enforcement.py
      test_parquet_io.py
      test_iceberg_io.py
      test_delta_v4_io.py

  governance/
    healthcare.yaml
    ecommerce.yaml
    financial.yaml

  datasets/
    generated/              # on-disk tables (Delta/Parquet/Iceberg) via volumes
    generators/
      common.py
      healthcare.py
      ecommerce.py
      financial.py

  examples/
    js/search-delta-redis.ts
    python/search_delta_redis.py
    python/load_parquet_example.py
    python/load_iceberg_example.py

  scripts/
    run-showcase.sh
    seed-tiny.sh
    seed-small.sh
    seed-medium.sh
    seed-large.sh
2) Table format support (Delta v4, Parquet, Iceberg)
Add a “Format” step (after size) with options:

Delta (v4) — default; enforced with deltalake (delta-rs). 
Delta
delta-io.github.io

Parquet — read/write with PyArrow. 
Apache Arrow

Iceberg — use PyIceberg (local file catalog) for create/load/query. 
py.iceberg.apache.org

Implementation notes:

The governance layer (RLS/CLS) is engine-agnostic. For each engine, push down row filters when possible; always apply column masks post-scan.

For Iceberg, use PyIceberg’s file catalog under datasets/generated/iceberg/<dataset>; simple partitioning (region, date). PyIceberg gained write support (Arrow) — use it. 
Tabular
Estuary

For Parquet, store under datasets/generated/parquet/<dataset> with partitioned directories and read via dataset discovery in PyArrow. 
Apache Arrow

3) Docker & deps
docker-compose.yml services:

redis:7

delta-api: python:3.11-slim with deltalake, fastapi, uvicorn, pyyaml, pydantic, pyarrow, pyiceberg

worker: node:20 with bullmq, ioredis, axios, zod

web: node:20 (Next.js)

.env.example

ini
Copy
Edit
REDIS_URL=redis://redis:6379
DELTA_DIR=/data/delta
PARQUET_DIR=/data/parquet
ICEBERG_DIR=/data/iceberg
PORT_WEB=3000
PORT_DELTA_API=8000
Mount datasets/generated into /data for all engines.

4) FastAPI endpoints
POST /seed → { dataset, size, format, governanceConfig?, role }

Sizes: tiny≈1k, small≈50k, medium≈500k, large≈5M (configurable)

For Delta v4: create/manage tables with deltalake writer; keep table properties compatible with Delta 4 (note in README). 
Delta Lake Documentation

For Parquet: write partitioned Parquet via PyArrow dataset writer.

For Iceberg: create a PyIceberg table in the file catalog; write Arrow batches.

Update progress in Redis (BullMQ job), pre-warm a couple of queries.

GET /progress?jobId=... → progress JSON

GET /search?q=&page=&pageSize=
Headers: X-User-Role, X-User-Context (JSON).

Compile governance → apply predicate pushdown (Delta via where, Parquet via dataset filter, Iceberg via table.scan().filter()) and then masks.

Cache each page in Redis: key hash of dataset|format|role|q|page|pageSize|policyVersion|tableVersion, TTL 5–10 min.

Return { items, page, total, maskedFields, strategy: { cacheHit|miss } }.

5) Governance (YAML DSL)
Same as prior spec (roles, row_filter, column_masks). Add built-in masks: redact_full, redact_part(keep=4), hash(sha256), tokenize, initials, year_only, yyyy_mm, city_only. Enforce server-side only.

6) Next.js UI
Stepper now includes Format. On Validate, show:

estimated row count after RLS (engine-specific fast count)

columns to be masked (CLS)

a 5-row preview with masks applied (fetched via API dry-run)

Hydrate step always enqueues; UI polls progress.

7) Developer examples
JS examples/js/search-delta-redis.ts
Use SmartSearchFactory.fromConfig() via a thin “delta-api” adapter; include format parameter in config and role/userContext headers.

Python

examples/python/search_delta_redis.py — query /search for Delta v4

examples/python/load_parquet_example.py — create a Parquet dataset with PyArrow, then call /search?format=parquet (RLS/CLS enforced server-side). 
Apache Arrow

examples/python/load_iceberg_example.py — create an Iceberg table with PyIceberg file catalog, insert sample data, then /search?format=iceberg. 
py.iceberg.apache.org

8) Tests (unit + e2e)
Python (pytest)

test_delta_v4_io.py: create/write/read a Delta v4 table via deltalake; assert basic schema/row count. 
Delta

test_parquet_io.py: write/read Parquet with PyArrow dataset API; partition pruning sanity. 
Apache Arrow

test_iceberg_io.py: create PyIceberg file-catalog table; write/read; simple filter. 
py.iceberg.apache.org

test_governance.py: policy → predicate + mask plan

test_masking.py: masking functions/formatters

test_rls_enforcement.py: fixtures per role; assert counts/masked columns

TypeScript (vitest)

governance-preview.test.tsx — editor enabled only for roles with can_edit_policies

search-table.test.tsx — masked badge rendering, page controls, cache indicator

Playwright e2e

seed-and-search.spec.ts (reuse root config):

Start compose

Healthcare + Format: Delta (v4) + Size: tiny → seed → search “asthma” → masked fields present; cache miss then hit

Repeat Format: Parquet tiny path and Format: Iceberg tiny path (smoke)

Switch roles (e.g., clinician → business_user) and assert RLS + CLS differences

9) Provider changes (if any)
If you add/modify a provider to support a "delta-api" format-aware backend in the main package:

Keep it non-breaking; introduce type: "delta-api" and allow format: "delta" | "parquet" | "iceberg".

Update provider unit tests to cover:

engine selection by format

request params & pagination

cache hit/miss reporting

Update provider e2e to include a tiny Delta v4 run and (optionally) Parquet run.

10) Scripts
scripts/run-showcase.sh:

docker-compose up --build -d

seed tiny Delta v4 healthcare, wait to 100%

run JS and Python search examples

optionally run quick Parquet/Iceberg loaders + a single search each

seed-*.sh: wrappers posting to /seed with {format, size}.

11) README highlights (with links)
“Delta Lake v4 + Redis, with RLS/CLS & masked, paginated search”

Quickstart: docker-compose up --build

UI walkthrough (dataset, size, format, governance, role, validate, hydrate, search)

How RLS/CLS works

How to run Delta v4, Parquet, and Iceberg examples

Links:

Delta Lake 4.0 release notes/blog + docs
(use delta.io releases/blog + docs) 
GitHub
Delta
+1

delta-rs / deltalake Python docs 
delta-io.github.io
GitHub

PyArrow Parquet docs 
Apache Arrow

PyIceberg docs 
py.iceberg.apache.org

12) Acceptance criteria
End-to-end works for Delta v4; Parquet/Iceberg examples run and are searchable through the same governance layer.

UI never blocks on large seeds; progress shown.

Search is paginated and masked; RLS/CLS enforced on server.

Redis caching with hit/miss indicator.

Unit tests + Playwright e2e pass.

If provider code modified, provider tests updated and passing.