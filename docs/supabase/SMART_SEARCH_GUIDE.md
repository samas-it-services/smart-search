# Quick Start Guide: Supabase & Redis with Smart Search

This guide provides a best-practice implementation for using the `@samas/smart-search` library with a Supabase Edge Function and Redis. It includes a well-documented, optimized example that developers can directly use in their projects.

## The Solution: A Better Architecture

The solution is to move the complexity and business logic into the `@samas/smart-search` library, where it belongs. The library is responsible for:

1.  **Data Hydration**: Providing a simple `hydrate()` method to perform a one-time, efficient sync of data from your Supabase database to your Redis cache.
2.  **Optimized Searching**: Handling the connection to Redis and using the efficient `FT.SEARCH` command to perform searches.

This leaves the Supabase Edge Function to be what it should be: a **thin, lightweight, and fast wrapper** that simply passes requests to the library. This architecture solves all the problems of a naive implementation and provides a robust, scalable, and maintainable solution.

## Step 1: Hydrate Your Redis Cache

Before you can search, you need to load your data from Supabase into Redis. The `smart-search` library provides a `hydrate()` method for this. You can run this as a one-off script or as part of a build process.

**Example Hydration Script (`hydrate.js`):**
```javascript
import { SmartSearchFactory } from '@samas/smart-search';

async function main() {
  const smartSearchConfig = {
    database: {
      type: 'supabase',
      connection: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY,
      },
    },
    cache: {
      type: 'redis',
      connection: {
        url: process.env.REDIS_URL,
      },
    },
    // ... other config
  };

  const smartSearch = SmartSearchFactory.fromConfig(smartSearchConfig);

  console.log('Starting data hydration...');
  await smartSearch.hydrate({
    source: 'supabase',
    table: 'your_table_name', // The table you want to index
    indexName: 'your-index-name',
    schema: {
      title: 'TEXT',
      description: 'TEXT',
      // ... other fields to index
    },
  });
  console.log('Hydration complete!');
}

main().catch(console.error);
```

## Step 2: Create the Supabase Edge Function

This is the code you will deploy to Supabase. It's a simple wrapper that uses the `smart-search` library to perform searches against your now-hydrated Redis cache.

**`supabase/functions/smart-search/index.ts`:**
```typescript
// A simple, optimized Supabase Edge Function for Smart Search.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmartSearchFactory } from 'https://esm.sh/@samas/smart-search@latest'; // Use the latest version

// --- Configuration ---
// Load these from environment variables in your Supabase project.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const REDIS_URL = Deno.env.get('REDIS_URL');

// --- Smart Search Initialization ---
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
      your_table_name: { // The same table you indexed
        columns: {
          id: 'id',
          title: 'title',
          description: 'description',
        },
        searchColumns: ['title', 'description'],
        type: 'your_data_type',
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
```

## Step 3: Set Environment Variables

In your Supabase project settings, you'll need to add the following environment variables:

*   `SUPABASE_URL`: Your project's Supabase URL.
*   `SUPABASE_ANON_KEY`: Your project's anonymous key.
*   `REDIS_URL`: The connection URL for your Redis instance.

## Instructions for AI Agents

You can use the following prompt to have an AI agent implement this for you in your project.

---

**Prompt for AI Agent:**

"Hello! I want you to help me set up a smart search feature in my Supabase project. I'll be using the `@samas/smart-search` library. Here's what I need you to do:

1.  **Create a new Supabase Edge Function.** The function should be named `smart-search`.
2.  **Use the provided code.** I have a reference implementation for the edge function. Please use the code I provide below and create the `supabase/functions/smart-search/index.ts` file.
3.  **Explain the environment variables.** I will need to set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `REDIS_URL` in my Supabase project. Please remind me to do this and explain what each one is for.
4.  **Provide a data hydration script.** I also need a script to load my data from a Supabase table into Redis. Please create a file named `hydrate.js` with the provided hydration script code. I will run this script myself.
5.  **Confirm the setup.** After you've created the files, please confirm the file structure and remind me to deploy the function and run the hydration script.

Here is the code for the edge function (`index.ts`):
```typescript
// ... (paste the edge function code from Step 2 here) ...
```

And here is the code for the hydration script (`hydrate.js`):
```javascript
// ... (paste the hydration script code from Step 1 here) ...
```

Please proceed with creating these two files and providing the instructions."

---
