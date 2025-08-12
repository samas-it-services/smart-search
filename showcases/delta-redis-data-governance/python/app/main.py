import os
import json
import time
import hashlib
from typing import Any, Dict, List

import yaml
import redis
from fastapi import FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

from .governance import compile_policy, apply_masks
from .data_loader import iter_incoming_rows
from pathlib import Path

REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379')
DELTA_DIR = os.getenv('DELTA_DIR', '/data/delta')
GOVERNANCE_DIR = os.getenv('GOVERNANCE_DIR', '/workspace/governance')

r = redis.Redis.from_url(REDIS_URL, decode_responses=True)

app = FastAPI(title="delta-api")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class SeedRequest(BaseModel):
    dataset: str
    size: str
    role: str
    governanceConfig: Dict[str, Any] | None = None
    forceDownload: bool | None = None


def _row_count_for_size(size: str) -> int:
    mapping = {
        'tiny': 1000,
        'small': 10000,   # keep reasonable for local demo
        'medium': 50000,  # reduced from 500k for demo speed
        'large': 100000   # reduced from 5M for demo speed
    }
    return mapping.get(size, 1000)


def _generate_row(dataset: str, i: int) -> Dict[str, Any]:
    conditions = ["asthma", "diabetes", "hypertension", "flu", "allergy"]
    return {
        "id": f"{dataset[:3]}-{i}",
        "name": f"Patient {i}",
        "ssn": f"123-45-{i:04d}",
        "dob": "1986-03-15",
        "address": "123 Main St, Gotham",
        "region": "NE" if i % 2 else "SW",
        "condition": conditions[i % len(conditions)],
        "clinician_id": f"clin-{i % 50}"
    }


@app.post('/seed')
def seed(req: SeedRequest):
    job_id = f"job_{int(time.time()*1000)}"
    r.hset(f"progress:{job_id}", mapping={"status": "running", "pct": 0, "writtenRows": 0})

    total_rows = _row_count_for_size(req.size)
    Path(DELTA_DIR).mkdir(parents=True, exist_ok=True)
    outfile = os.path.join(DELTA_DIR, f"{req.dataset}_{req.size}.jsonl")

    written = 0
    chunk = 1000
    incoming_base = os.getenv('INCOMING_BASE_DIR', '/tmp/smart-search-incoming')
    incoming_dir = os.path.join(incoming_base, req.dataset)
    os.makedirs(incoming_dir, exist_ok=True)

    # Optionally download live data when empty or forced
    if req.forceDownload or not any(fname.endswith(('.json','.jsonl')) for fname in os.listdir(incoming_dir)):
        _download_live_data(req.dataset, incoming_dir)
    used_external = False

    with open(outfile, 'w') as f:
        # If external files available, stream-transform those first
        total_written = 0
        if os.path.isdir(incoming_dir):
            for row in iter_incoming_rows(incoming_dir, req.dataset):
                f.write(json.dumps(row) + "\n")
                total_written += 1
                if total_written % chunk == 0:
                    pct = max(1, int(total_written / total_rows * 100))
                    r.hset(f"progress:{job_id}", mapping={"status": "running", "pct": pct, "writtenRows": total_written})
            used_external = total_written > 0

        # Top up synthetic rows if external is insufficient
        remaining = max(0, total_rows - total_written)
        if remaining > 0:
            for start in range(1, remaining + 1, chunk):
                end = min(start + chunk - 1, remaining)
                for i in range(start, end + 1):
                    row = _generate_row(req.dataset, i)
                    f.write(json.dumps(row) + "\n")
                total_written += (end - start + 1)
                pct = max(1, int(total_written / total_rows * 100))
                r.hset(
                    f"progress:{job_id}",
                    mapping={"status": "running" if total_written < total_rows else "completed", "pct": pct, "writtenRows": total_written}
                )
                time.sleep(0.02)
        for start in range(1, total_rows + 1, chunk):
            end = min(start + chunk - 1, total_rows)
            for i in range(start, end + 1):
                row = _generate_row(req.dataset, i)
                f.write(json.dumps(row) + "\n")
            written = end
            pct = max(1, int(written / total_rows * 100))
            r.hset(
                f"progress:{job_id}",
                mapping={"status": "running" if written < total_rows else "completed", "pct": pct, "writtenRows": written}
            )
            time.sleep(0.05)

    # Persist dataset meta
    r.hset(f"dataset_meta:{req.dataset}", mapping={"path": outfile, "rows": total_rows, "size": req.size})

    return {"jobId": job_id, "source": "external" if used_external else "synthetic"}


def _download_live_data(dataset: str, target_dir: str) -> None:
    os.makedirs(target_dir, exist_ok=True)
    # Dataset-specific env overrides
    urls: list[str] = []
    env_url = os.getenv(f'DATA_URL_{dataset.upper()}')
    if env_url:
        urls.append(env_url)
    # Generic env override
    if not urls and os.getenv('DATA_URL_GENERIC'):
        urls.append(os.getenv('DATA_URL_GENERIC'))

    # Sensible public samples as fallback
    if not urls:
        if dataset == 'healthcare':
            urls = [
                'https://raw.githubusercontent.com/vega/vega-datasets/master/data/movies.json',
            ]
        elif dataset == 'ecommerce':
            urls = [
                'https://raw.githubusercontent.com/vega/vega-datasets/master/data/cars.json',
            ]
        elif dataset == 'financial':
            urls = [
                'https://raw.githubusercontent.com/vega/vega-datasets/master/data/stocks.json',
            ]

    for idx, url in enumerate(urls):
        try:
            resp = requests.get(url, timeout=20)
            if resp.ok:
                out = os.path.join(target_dir, f'part_{idx}.json')
                with open(out, 'wb') as f:
                    f.write(resp.content)
        except Exception:
            continue


@app.get('/progress')
def progress(jobId: str):
    data = r.hgetall(f"progress:{jobId}")
    if not data:
        return {"status": "unknown", "pct": 0, "writtenRows": 0}
    data["pct"] = int(data.get("pct", 0))
    data["writtenRows"] = int(data.get("writtenRows", 0))
    return data


def cache_key(params: Dict[str, Any], policy_version: str = "v1") -> str:
    s = json.dumps(params, sort_keys=True)
    return "search:" + hashlib.sha256((s + policy_version).encode()).hexdigest()


@app.get('/search')
def search(request: Request, q: str, page: int = 1, pageSize: int = 25, dataset: str = 'healthcare'):
    user_role = request.headers.get('X-User-Role', 'business_user')
    context_raw = request.headers.get('X-User-Context', '{}')
    try:
        user_ctx = json.loads(context_raw)
    except Exception:
        user_ctx = {}

    params = {"q": q, "page": page, "pageSize": pageSize, "dataset": dataset, "role": user_role}
    key = cache_key(params)
    cached = r.get(key)
    if cached:
        payload = json.loads(cached)
        payload["strategy"] = {"cache": "hit"}
        return payload

    # Load governance policy
    policy_path = os.path.join(GOVERNANCE_DIR, f'{dataset}.yaml')
    with open(policy_path, 'r') as f:
        policy = yaml.safe_load(f)

    predicate, mask_plan = compile_policy(policy, user_role, user_ctx)

    # Load dataset from generated JSONL
    meta = r.hgetall(f"dataset_meta:{dataset}")
    items: List[Dict[str, Any]] = []
    total = 0
    ql = q.lower()
    offset = (page - 1) * pageSize

    def match_and_mask(row: Dict[str, Any]) -> Dict[str, Any]:
        return apply_masks(row, mask_plan)

    if meta and os.path.exists(meta.get('path', '')):
        path = meta['path']
        with open(path, 'r') as f:
            for line in f:
                try:
                    row = json.loads(line)
                except Exception:
                    continue
                if ql in row.get('name', '').lower() or ql in row.get('condition', '').lower():
                    # Apply RLS
                    if predicate(row):
                        if total >= offset and len(items) < pageSize:
                            items.append(match_and_mask(row))
                        total += 1
        # Fallback if nothing matched but dataset exists
        if total == 0:
            fsize = int(meta.get('rows', '0'))
            # take first page unfiltered as demo fallback
            with open(path, 'r') as f2:
                for idx, line in enumerate(f2):
                    if idx < pageSize:
                        try:
                            row = json.loads(line)
                            if predicate(row):
                                items.append(match_and_mask(row))
                        except Exception:
                            pass
                    else:
                        break
            total = max(len(items), fsize)
    else:
        # As last resort, generate a tiny in-memory dataset
        for i in range(1, 1001):
            row = _generate_row(dataset, i)
            if ql in row['name'].lower() or ql in row['condition'].lower():
                if predicate(row):
                    if total >= offset and len(items) < pageSize:
                        items.append(match_and_mask(row))
                    total += 1

    response = {
        "items": items,
        "page": page,
        "total": total,
        "maskedFields": list(mask_plan.keys()),
        "strategy": {"cache": "miss"}
    }

    r.setex(key, 300, json.dumps(response))
    return response

