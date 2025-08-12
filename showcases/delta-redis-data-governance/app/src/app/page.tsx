'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

type Dataset = 'healthcare' | 'ecommerce' | 'financial';
type Size = 'tiny' | 'small' | 'medium' | 'large';
type Role = 'admin' | 'data_modeler' | 'clinician' | 'analyst' | 'business_user';

export default function Page() {
  const [dataset, setDataset] = useState<Dataset>('healthcare');
  const [size, setSize] = useState<Size>('tiny');
  const [role, setRole] = useState<Role>('analyst');
  const [query, setQuery] = useState('asthma');
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ pct: number; status: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [cacheStrategy, setCacheStrategy] = useState<'hit' | 'miss' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const id = setInterval(async () => {
      const res = await axios.get(`/api/progress`, { params: { jobId } });
      setProgress({ pct: res.data.pct, status: res.data.status });
      if (res.data.status === 'completed') clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [jobId]);

  const onSeed = async () => {
    setProgress({ pct: 0, status: 'queued' });
    const res = await axios.post(`/api/seed`, { dataset, size, role });
    setJobId(res.data.jobId);
  };

  const onSearch = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/search`, {
        params: { q: query, page, pageSize, dataset, role },
      });
      setResults(res.data.items);
      setTotal(res.data.total);
      setCacheStrategy(res.data.strategy?.cache);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <main>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Dataset</div>
            <select value={dataset} onChange={(e) => setDataset(e.target.value as Dataset)} style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0b1220', color: '#e5e7eb', border: '1px solid #334155' }}>
              <option value="healthcare">Healthcare</option>
              <option value="ecommerce">E-commerce</option>
              <option value="financial">Financial</option>
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Size</div>
            <select value={size} onChange={(e) => setSize(e.target.value as Size)} style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0b1220', color: '#e5e7eb', border: '1px solid #334155' }}>
              <option value="tiny">Tiny</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Role</div>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0b1220', color: '#e5e7eb', border: '1px solid #334155' }}>
              <option value="admin">Admin</option>
              <option value="data_modeler">Data Modeler</option>
              <option value="clinician">Clinician</option>
              <option value="analyst">Analyst</option>
              <option value="business_user">Business User</option>
            </select>
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button onClick={onSeed} style={{ padding: '10px 16px', borderRadius: 8, background: '#22c55e', color: '#052e16', border: 'none', cursor: 'pointer' }}>Seed</button>
            {progress && (
              <span style={{ marginLeft: 12, fontSize: 13, opacity: 0.8 }}>
                {progress.status} — {progress.pct}%
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." style={{ flex: 1, padding: 10, borderRadius: 8, background: '#0b1220', color: '#e5e7eb', border: '1px solid #334155' }} />
          <button onClick={onSearch} disabled={loading} style={{ padding: '10px 16px', borderRadius: 8, background: '#60a5fa', color: '#0b1220', border: 'none', cursor: 'pointer' }}>Search</button>
          {cacheStrategy && <span style={{ fontSize: 12, opacity: 0.8 }}>cache: {cacheStrategy}</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.85 }}>
          <div>Page: {page} / {totalPages}</div>
          <div>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '8px 12px', borderRadius: 8, marginRight: 6 }}>Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '8px 12px', borderRadius: 8 }}>Next</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #334155', padding: 8 }}>id</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #334155', padding: 8 }}>name</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #334155', padding: 8 }}>ssn</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #334155', padding: 8 }}>dob</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #334155', padding: 8 }}>address</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #334155', padding: 8 }}>region</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #334155', padding: 8 }}>condition</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: 8 }}>{r.id}</td>
                  <td style={{ padding: 8 }}>{r.name}</td>
                  <td style={{ padding: 8 }}>{r.ssn}</td>
                  <td style={{ padding: 8 }}>{r.dob}</td>
                  <td style={{ padding: 8 }}>{r.address}</td>
                  <td style={{ padding: 8 }}>{r.region}</td>
                  <td style={{ padding: 8 }}>{r.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}


