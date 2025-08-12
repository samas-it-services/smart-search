## Live Data Ingestion Config for Delta Lake + Redis Governance Showcase

This post describes the environment variables that control live data download and ingestion for the `showcases/delta-redis-data-governance` demo. These variables let you point the seeding process at your own HTTP-accessible datasets without committing data to the repo.

### Overview

- The Python API service (delta-api) seeds the dataset by writing JSONL files under `DELTA_DIR` and tracks progress in Redis.
- If no local incoming data is available (or you force it), the service downloads sample JSON/JSONL files at runtime into container temp space and transforms them into the unified row schema used by the search layer.

### Environment variables

- DATA_URL_HEALTHCARE
  - Type: string (URL)
  - Default: none
  - Description: HTTP(S) URL to a healthcare dataset (JSON or JSONL). When set, it is preferred over built-in sample URLs. If the URL returns a JSON array, all objects are transformed; if JSONL, each line is treated as one object.
  - Example:
    ```
    DATA_URL_HEALTHCARE=https://example.org/data/healthcare-sample.json
    ```

- DATA_URL_ECOMMERCE
  - Type: string (URL)
  - Default: none
  - Description: HTTP(S) URL to an e-commerce dataset (JSON or JSONL). Same parsing rules as above.

- DATA_URL_FINANCIAL
  - Type: string (URL)
  - Default: none
  - Description: HTTP(S) URL to a financial dataset (JSON or JSONL). Same parsing rules as above.

- DATA_URL_GENERIC
  - Type: string (URL)
  - Default: none
  - Description: Fallback URL used when a dataset-specific URL is not set.

- INCOMING_BASE_DIR
  - Type: string (absolute path inside the container)
  - Default: `/tmp/smart-search-incoming`
  - Description: Directory where downloaded raw files are stored, e.g. `/tmp/smart-search-incoming/healthcare/part_0.json`. These files are ephemeral and not committed to git. The API transforms them into JSONL under `DELTA_DIR`.
  - Example:
    ```
    INCOMING_BASE_DIR=/tmp/my-incoming
    ```

### Behavior

- If `forceDownload=true` is passed to `/seed`, the API downloads fresh data even if previously downloaded files exist.
- If no incoming files exist (e.g., first run), the API automatically downloads from the dataset-specific URL or `DATA_URL_GENERIC`. If no custom URL is set, it falls back to small public sample datasets suitable for demos.
- After download, objects are transformed into the showcase row schema:
  - `id`, `name`, `ssn`, `dob`, `address`, `region`, `condition`, `clinician_id`

### How to set variables

- In the showcase `.env` (preferred for docker-compose):
  ```
  DATA_URL_HEALTHCARE=https://example.org/healthcare.json
  DATA_URL_ECOMMERCE=https://example.org/ecommerce.jsonl
  DATA_URL_FINANCIAL=https://example.org/financial.json
  DATA_URL_GENERIC=https://example.org/fallback.json
  INCOMING_BASE_DIR=/tmp/smart-search-incoming
  ```

- Inline for a one-off run:
  ```
  INCOMING_BASE_DIR=/tmp/smart-search-incoming \
  DATA_URL_HEALTHCARE=https://example.org/healthcare.json \
  docker compose up -d
  ```

### Seeding with live download

- Using the helper script:
  ```
  ./scripts/download-and-seed.sh healthcare tiny analyst true
  ```

- Via API directly:
  ```
  curl -X POST http://localhost:8000/seed \
    -H 'Content-Type: application/json' \
    -d '{"dataset":"healthcare","size":"tiny","role":"analyst","forceDownload":true}'
  ```

### Security notes

- Only use trusted URLs. The service downloads and transforms data without authentication.
- Large remote files can increase seed time and disk usage inside the container. Monitor available space in `INCOMING_BASE_DIR` and `DELTA_DIR`.


