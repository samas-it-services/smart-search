// examples/supabase-edge-function/index.ts
// A simple, optimized Supabase Edge Function for Smart Search.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmartSearchFactory } from 'https://esm.sh/@samas/smart-search@latest'; // Use the latest version

// --- Configuration ---
// Load these from environment variables in your Supabase project.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const REDIS_URL = Deno.env.get('REDIS_URL');

// --- Smart Search Initialization ---
// This section should be outside your request handler to ensure the
// SmartSearch instance is reused across function invocations.

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !REDIS_URL) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, REDIS_URL'
  );
}

const smartSearchConfig = {
  database: {
    type: 'supabase',
    connection: {
      url: SUPABASE_URL,
      key: SUPABASE_ANON_KEY,
    },
  },
  cache: {
    type: 'redis',
    connection: {
      url: REDIS_URL,
    },
  },
  search: {
    tables: {
      healthcare_data: {
        columns: {
          id: 'id',
          title: 'title',
          description: 'description',
        },
        searchColumns: ['title', 'description'],
        type: 'healthcare',
      },
    },
  },
};

const smartSearch = SmartSearchFactory.fromConfig(smartSearchConfig);
console.log('SmartSearch instance initialized.');

// --- Edge Function Handler ---

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use the SmartSearch library to perform the search.
    // The library will handle the logic of querying the Redis cache.
    const searchResult = await smartSearch.search(query);

    return new Response(JSON.stringify(searchResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Error in Smart Search Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
