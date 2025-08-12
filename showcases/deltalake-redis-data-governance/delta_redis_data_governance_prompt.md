# Delta Lake 4 + Redis: Data Governance Showcase (Prompt for Implementation)

You are contributing to `https://github.com/samas-it-services/smart-search` (NPM package `@bilgrami/smart-search`).

Create a **new, self-contained showcase** under:

**`showcases/delta-redis-data-governance/`**

**Name:** **“Delta Lake 4 + Redis: Data Governance (RLS/CLS) & Masked, Paginated Search”**

This demo must support **Delta Lake v4** (open-source delta.io), and include **Parquet** and **Iceberg** load examples. Use `delta-rs` (Python bindings `deltalake`) for Delta v4 tables; use **PyArrow** for Parquet and **PyIceberg** for Iceberg.
the providers are written in typescript as part of this repo. 
---

## 1) Folder tree (everything inside this folder)

```
showcases/delta-redis-data-governance/
  README.md
  docker-compose.yml
  .env.example

  app/
    package.json
    next.config.mjs
    src/
      app/
        layout.tsx
        page.tsx
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
          seed-and-search.spec.ts

  worker/
    package.json
    src/worker.ts

  python/
    pyproject.toml
    app/main.py
    app/delta_engine.py
    app/parquet_engine.py
    app/iceberg_engine.py
    app/governance.py
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
    generated/
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
```

---

## 2) Table format support

Add a **Format** step (after size) with options:

- **Delta (v4)** — default; use `deltalake` (delta-rs)
- **Parquet** — use PyArrow
- **Iceberg** — use PyIceberg (local file catalog)

Governance layer is **engine-agnostic**. Push down row filters where possible; always apply column masks after scanning.

---

## 3) Docker & dependencies

`docker-compose.yml` services:

- `redis:7`
- `delta-api`: python:3.11-slim with `deltalake`, `fastapi`, `uvicorn`, `pyyaml`, `pydantic`, `pyarrow`, `pyiceberg`
- `worker`: node:20 with `bullmq`, `ioredis`, `axios`, `zod`
- `web`: node:20 (Next.js)

`.env.example`:

```
REDIS_URL=redis://redis:6379
DELTA_DIR=/data/delta
PARQUET_DIR=/data/parquet
ICEBERG_DIR=/data/iceberg
PORT_WEB=3000
PORT_DELTA_API=8000
```

---

## 4) FastAPI endpoints

- **POST /seed**
  - `{ dataset, size, format, governanceConfig?, role }`
  - Sizes: tiny≈1k, small≈50k, medium≈500k, large≈5M
  - Delta v4: `deltalake` writer
  - Parquet: PyArrow dataset writer
  - Iceberg: PyIceberg table writer
  - Progress in Redis (BullMQ job)
- **GET /progress**
- **GET /search**
  - Apply RLS via predicate pushdown
  - Apply CLS masking
  - Cache page in Redis with TTL

---

## 5) Governance (YAML DSL)

Roles with:
- `can_edit_policies`
- `row_filter`
- `column_masks`

Masks:
- `redact_full`, `redact_part`, `hash`, `tokenize`, `initials`
- `year_only`, `yyyy_mm`, `city_only`

---

## 6) Next.js UI

Stepper includes:
1. Dataset
2. Size
3. **Format**
4. Governance
5. Role
6. Validate
7. Hydrate
8. Search

---

## 7) Developer examples

- **JS**: `examples/js/search-delta-redis.ts`  
  Uses `SmartSearchFactory.fromConfig()` adapter for `delta-api`.
- **Python**:  
  - `search_delta_redis.py` for Delta v4  
  - `load_parquet_example.py` for Parquet  
  - `load_iceberg_example.py` for Iceberg

---

## 8) Tests

**Python (pytest)**:
- `test_delta_v4_io.py`
- `test_parquet_io.py`
- `test_iceberg_io.py`
- `test_governance.py`
- `test_masking.py`
- `test_rls_enforcement.py`

**TypeScript (vitest)**:
- `governance-preview.test.tsx`
- `search-table.test.tsx`

**Playwright e2e**:
- Delta v4 + Parquet + Iceberg tiny seeds
- Verify RLS/CLS differences by role

---

## 9) Provider changes

If adding/modifying a provider to support `"delta-api"` with formats:
- Keep backward-compatible
- Update provider unit & e2e tests

---

## 10) Scripts

- `run-showcase.sh` — bring up compose, seed tiny, run JS/Python examples
- `seed-*.sh` — wrappers for `/seed`

---

## 11) README highlights

Include:
- Delta Lake **v4** support
- Links to delta.io v4 docs
- Parquet & Iceberg example usage
- Step-by-step run guide
- RLS/CLS explanation

---

## 12) Acceptance criteria

- Works end-to-end for **Delta v4**
- Parquet & Iceberg examples work
- UI is non-blocking with progress
- RLS/CLS enforced server-side
- Redis cache with hit/miss indicator
- Unit & e2e tests pass
- Provider tests updated if code changed
