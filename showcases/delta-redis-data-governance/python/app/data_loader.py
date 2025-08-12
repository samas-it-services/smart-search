import os
import json
from typing import Any, Dict, Generator, Iterable


def iter_incoming_rows(incoming_dir: str, dataset: str) -> Generator[Dict[str, Any], None, None]:
    if not incoming_dir or not os.path.isdir(incoming_dir):
        return

    # Support both jsonl and json array files
    for fname in os.listdir(incoming_dir):
        path = os.path.join(incoming_dir, fname)
        if not os.path.isfile(path):
            continue
        try:
            if fname.endswith('.jsonl'):
                with open(path, 'r') as f:
                    for line in f:
                        try:
                            obj = json.loads(line)
                        except Exception:
                            continue
                        row = transform_object_to_row(obj, dataset)
                        if row:
                            yield row
            elif fname.endswith('.json'):
                with open(path, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for obj in data:
                            row = transform_object_to_row(obj, dataset)
                            if row:
                                yield row
        except Exception:
            continue


def transform_object_to_row(obj: Dict[str, Any], dataset: str) -> Dict[str, Any] | None:
    # Try to map common fields from various sources
    name = obj.get('name') or obj.get('title') or obj.get('company_name') or obj.get('study_title')
    if not name:
        return None
    condition = (
        obj.get('condition') or obj.get('keywords') or obj.get('sector') or obj.get('disease') or obj.get('category') or 'general'
    )
    if isinstance(condition, list):
        condition = (condition[0] if condition else 'general')
    region = obj.get('region') or obj.get('country') or 'NE'
    address = obj.get('address') or obj.get('location') or 'Unknown'
    idx = abs(hash(name)) % 1000000
    return {
        'id': f'{dataset[:3]}-{idx}',
        'name': str(name)[:120],
        'ssn': f'123-45-{idx % 10000:04d}',
        'dob': '1986-03-15',
        'address': str(address)[:200],
        'region': str(region)[:20],
        'condition': str(condition)[:80],
        'clinician_id': f'clin-{idx % 50}'
    }


