import os
import json
import requests

base = os.getenv('DELTA_API_URL', 'http://localhost:8000')
role = os.getenv('ROLE', 'business_user')
ctx = {"allowed_regions": ["NE", "SW"], "id": "demo-user"}

r = requests.get(f"{base}/search", params={
    'q': 'asthma', 'page': 1, 'pageSize': 25, 'dataset': 'healthcare', 'role': role
}, headers={
    'X-User-Role': role,
    'X-User-Context': json.dumps(ctx)
})

data = r.json()
print('strategy:', data.get('strategy'))
print('rows (3):', data.get('items', [])[:3])

