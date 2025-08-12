// Demonstrate using SmartSearch with a custom DatabaseProvider adapter
// that calls the local delta-api HTTP endpoints.

import { SmartSearch } from '../../../../src/SmartSearch';
import type { DatabaseProvider, SearchOptions, SearchResult, HealthStatus } from '../../../../src/types';

class DeltaApiProvider implements DatabaseProvider {
  public name = 'DeltaApi';
  private baseUrl: string;
  private defaultDataset: string;
  private defaultRole: string;
  private userContext: Record<string, any>;

  constructor(opts: { baseUrl: string; dataset?: string; role?: string; userContext?: Record<string, any> }) {
    this.baseUrl = opts.baseUrl;
    this.defaultDataset = opts.dataset || 'healthcare';
    this.defaultRole = opts.role || 'analyst';
    this.userContext = opts.userContext || { allowed_regions: ['NE', 'SW'], id: 'demo-user' };
  }

  async connect(): Promise<void> { /* no-op */ }
  async disconnect(): Promise<void> { /* no-op */ }
  async isConnected(): Promise<boolean> { return true; }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const limit = options.limit ?? 25;
    const offset = options.offset ?? 0;
    const page = Math.floor(offset / limit) + 1;
    const pageSize = limit;
    const dataset = (options.filters?.custom?.dataset as string) || this.defaultDataset;
    const role = (options.filters?.custom?.role as string) || this.defaultRole;

    const url = new URL('/search', this.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('dataset', dataset);
    url.searchParams.set('role', role);

    const res = await fetch(url.toString(), {
      headers: {
        'X-User-Role': role,
        'X-User-Context': JSON.stringify(this.userContext)
      }
    });
    if (!res.ok) throw new Error(`delta-api search failed: ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    // Map to SearchResult shape
    const results: SearchResult[] = items.map((r: any) => ({
      id: String(r.id),
      type: 'healthcare_data',
      title: r.name || 'Record',
      description: `region=${r.region}`,
      matchType: 'custom',
      relevanceScore: 100,
      metadata: { raw: r, maskedFields: data.maskedFields }
    }));

    return results;
  }

  async checkHealth(): Promise<HealthStatus> {
    try {
      const url = new URL('/progress', this.baseUrl);
      url.searchParams.set('jobId', 'health');
      const res = await fetch(url.toString());
      return { isConnected: res.ok, isSearchAvailable: true, latency: 10 };
    } catch {
      return { isConnected: false, isSearchAvailable: false };
    }
  }
}

async function main() {
  const deltaApi = new DeltaApiProvider({ baseUrl: 'http://localhost:8000' });
  const smart = new SmartSearch({ database: deltaApi, fallback: 'database' });

  const { results, performance, strategy } = await smart.search('asthma', {
    limit: 25,
    offset: 0,
    filters: { custom: { dataset: 'healthcare', role: 'clinician' } }
  });

  console.log('strategy:', strategy);
  console.log('performance:', performance);
  console.log('results (3):', results.slice(0, 3));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


