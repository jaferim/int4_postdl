/*** scripts/import-seed-to-strapi.js ***

Re-syncs LOCAL Strapi from the canonical web/src/data/seed.json (the "open task" noted in memory). Strapi was stale/diverged; this makes it match the seed so we can `strapi transfer` the data up to Render and flip the frontend to VITE_USE_API=true.

Requires the additive cms schema edits already in this branch:
  - facet.type enum includes "shop"
  - facet has a `name` string  (shop facets set name=title, so the API returns f.shop.name)
  - facet.shop is a self-relation (manyToOne → api::facet.facet), so an item points at its shop FACET

Restart / let `strapi develop` reload before running.

Strategy (shops live as facets, matching seed + the canvas — see graph.js):

    0. WIPE    existing edges → facets → tags → curators → shop records (stale data).
    1. CREATE  curators + tags (the small lookup collections).
    2. CREATE  every facet (shop/item/moodboard/vibe) WITHOUT its shop link yet; connect curator + tags by the new ids. Remember seedDocId → newId.
    3. LINK    each item's `shop` to its shop FACET (matched by name).
    4. CREATE  every edge, remapping source/target seedDocId → new facet id.

    node scripts/import-seed-to-strapi.js    # DRY RUN — counts only, no writes
  
    DRY_RUN=false node scripts/import-seed-to-strapi.js   # real run — WIPES + imports local Strapi

Local-only by design (STRAPI_URL defaults to localhost in scripts/strapi.js) to protect the Render free-plan quota; push to Render afterwards via `strapi transfer`. ***/

import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { STRAPI_URL, strapiGetAll, strapiCreate, strapiUpdate } from "./strapi.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(__dir, "../web/src/data/seed.json");
const DRY_RUN = process.env.DRY_RUN !== "false";
const TOKEN = process.env.STRAPI_TOKEN;

const seed = JSON.parse(readFileSync(SEED, "utf8"));

/*** helpers ***/
async function deleteAll(collection) {
  const rows = await strapiGetAll(collection);
  for (const r of rows) {
    const res = await fetch(`${STRAPI_URL}/api/${collection}/${r.documentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) throw new Error(`DELETE ${collection}/${r.documentId}: ${res.status}`);
  }
  return rows.length;
}

// Unique curators / tags pulled out of the seed facets.
const curators = new Map(); // docId -> {name,handle,bio,socials}
const tags = new Map(); // label -> {label,kind}
for (const f of seed.facets) {
  if (f.curator) curators.set(f.curator.documentId, f.curator);
  for (const t of f.tags || []) tags.set(t.label, t);
}

console.log(`Target Strapi: ${STRAPI_URL}`);
console.log(
  `Seed: ${seed.facets.length} facets, ${seed.edges.length} edges, ${tags.size} tags, ${curators.size} curators`,
);

if (DRY_RUN) {
  const shops = seed.facets.filter((f) => f.type === "shop").length;
  const items = seed.facets.filter((f) => f.type === "item").length;
  console.log(`Would WIPE local edges/facets/tags/curators/shops, then create:`);
  console.log(`  ${curators.size} curators, ${tags.size} tags`);
  console.log(`  ${seed.facets.length} facets (${shops} shop, ${items} item, …)`);
  console.log(`  ${seed.edges.length} edges`);
  console.log("\nDRY RUN — nothing written. Re-run with DRY_RUN=false to apply.");
  process.exit(0);
}

if (!TOKEN) throw new Error("Missing STRAPI_TOKEN in scripts/.env");

// 0. WIPE (edges before facets — edges reference facets) 
for (const c of ["edges", "facets", "tags", "curators", "shops"]) {
  const n = await deleteAll(c);
  console.log(`wiped ${c}: ${n}`);
}

// Strapi 5 connects relations by documentId, so every lookup map below stores the new documentId.

// 1. curators + tags 

const curatorDoc = new Map(); // seed curator docId -> new documentId
for (const [docId, c] of curators) {
  const created = await strapiCreate("curators", {
    name: c.name,
    handle: c.handle ?? null,
    bio: c.bio ?? null,
    subculture: c.subculture ?? null,
    tone: c.tone ?? null,
    quote: c.quote ?? null,
    antwerpTips: c.antwerpTips ?? null,
    avatarUrl: c.avatarUrl ?? null,
    slug: c.slug ?? null,
    socials: c.socials ?? null,
  });
  curatorDoc.set(docId, created.documentId);
}
const tagDoc = new Map(); // label -> new documentId
for (const [label, t] of tags) {
  const created = await strapiCreate("tags", { label: t.label, kind: t.kind ?? null });
  tagDoc.set(label, created.documentId);
}
console.log(`created ${curatorDoc.size} curators, ${tagDoc.size} tags`);

// 2. facets (no shop link yet) 

const facetDoc = new Map(); // seed facet docId -> new documentId
const shopFacetDocByName = new Map(); // shop name -> new shop-facet documentId
for (const f of seed.facets) {
  const created = await strapiCreate("facets", {
    title: f.title,
    name: f.title, // so a populated f.shop exposes .name (graph.js reads f.shop?.name)
    subtitle: f.subtitle ?? null,
    type: f.type,
    price: f.price ?? null,
    availability: f.availability ?? "available",
    embedding: f.embedding ?? null,
    data: f.data ?? null,
    curator: f.curator ? curatorDoc.get(f.curator.documentId) : null,
    tags: (f.tags || []).map((t) => tagDoc.get(t.label)).filter(Boolean),
  });
  facetDoc.set(f.documentId, created.documentId);
  if (f.type === "shop") shopFacetDocByName.set(f.title, created.documentId);
}
console.log(`created ${facetDoc.size} facets`);

// 3. link items → their shop facet

let linked = 0;
for (const f of seed.facets) {
  if (!f.shop) continue;
  const shopFacetDocId = shopFacetDocByName.get(f.shop.name);
  if (!shopFacetDocId) {
    console.warn(`! item "${f.title}" references unknown shop "${f.shop?.name}"`);
    continue;
  }
  await strapiUpdate("facets", facetDoc.get(f.documentId), { shop: shopFacetDocId });
  linked++;
}
console.log(`linked ${linked} items to their shop facet`);

// 4. edges 
let edgeCount = 0;
for (const e of seed.edges) {
  const src = facetDoc.get(e.source?.documentId || e.source);
  const tgt = facetDoc.get(e.target?.documentId || e.target);
  if (!src || !tgt) {
    console.warn(`! edge ${e.documentId} skipped — endpoint not found`);
    continue;
  }
  await strapiCreate("edges", {
    source: src,
    target: tgt,
    relationType: e.relationType,
    weight: e.weight ?? null,
    origin: e.origin ?? "ai_suggested",
  });
  edgeCount++;
}
console.log(`created ${edgeCount} edges`);
console.log("\n✓ Local Strapi re-synced from seed.json.");
