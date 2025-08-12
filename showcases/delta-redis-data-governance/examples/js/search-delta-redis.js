;(async function main() {
  const base = process.env.DELTA_API_URL || 'http://localhost:8000';
  const role = process.env.ROLE || 'analyst';
  const userCtx = { id: 'clin-42', allowed_regions: ['NE'] };

  const url = new URL('/search', base);
  url.searchParams.set('q', 'asthma');
  url.searchParams.set('page', '1');
  url.searchParams.set('pageSize', '25');
  url.searchParams.set('dataset', 'healthcare');
  url.searchParams.set('role', role);

  const res = await fetch(url.toString(), {
    headers: { 'X-User-Role': role, 'X-User-Context': JSON.stringify(userCtx) }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  console.log('strategy:', data.strategy);
  console.log('rows (3):', data.items.slice(0, 3));
})().catch((e) => { console.error(e); process.exit(1); });

