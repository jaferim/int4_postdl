/*** dump-seed.js ***

Fetches all facets + edges from local Strapi and writes them to web/src/data/seed.json in the exact shape load.js / graph.js expect.

Run any time you want the frontend (USE_API=false) to reflect local Strapi: node dump-seed.js

No DRY_RUN — this only reads from Strapi and writes one local file. Safe.
***/

import 'dotenv/config';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const TOKEN      = process.env.STRAPI_TOKEN;
const API        = `${STRAPI_URL}/api`;

const HEADERS = {
  'Content-Type': 'application/json',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

// seed.json lives at web/src/data/seed.json relative to /scripts
const __dir      = dirname(fileURLToPath(import.meta.url));
const SEED_PATH  = resolve(__dir, '../web/src/data/seed.json');


/*** Fetch all pages of a collection with full population ***/ 
async function fetchAll(collection, populate) {
  const records = [];
  let page = 1;

  while (true) {
    const popQ = populate.map(p => `populate[${p}]=true`).join('&');
    const url  = `${API}/${collection}?${popQ}&pagination[page]=${page}&pagination[pageSize]=100`;
    const res  = await fetch(url, { headers: HEADERS });

    if (!res.ok) throw new Error(`GET /${collection} page ${page} → ${res.status} ${await res.text()}`);

    const json = await res.json();
    records.push(...(json.data ?? []));

    const pg = json.meta?.pagination;
    if (!pg || page >= pg.pageCount) break;
    page++;
  }

  return records;
}

/*** Main ***/

async function main() {
  console.log(`\n📦 dump-seed → ${STRAPI_URL}\n`);

  // Facets: populate everything graph.js and ItemDetail will need
  console.log('Fetching facets...');
  const facets = await fetchAll('facets', [
    'tags',
    'curator',
    'shop',
    'media',
  ]);
  console.log(`  → ${facets.length} facets`);

  // Edges: populate source + target so graph.js can build links
  console.log('Fetching edges...');
  const edges = await fetchAll('edges', [
    'source',
    'target',
  ]);
  console.log(`  → ${edges.length} edges`);

  // Write — shape is { facets, edges }, matching what load.js imports
  const seed = { facets, edges };
  writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), 'utf8');

  console.log(`\n✅  Written to ${SEED_PATH}`);
  console.log('   Restart `npm run dev` in /web if Vite is already running.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
