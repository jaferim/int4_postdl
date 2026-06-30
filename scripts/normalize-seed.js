#!/usr/bin/env node
/***
 normalize-seed.js  —  standardizes web/src/data/seed.json to the agreed schema.
 Re-runnable. `--dry` previews without writing.

 AGREED MODEL (supersedes architecture.md where they differ):
   - facet.type = vibe | moodboard | shop | item (NO `area` type, NO `spaceType` field)
   - vibe      : aesthetic cluster centre
   - moodboard : curated cross-shop collection
   - shop      : a store / market / venue that sells items   (renders PINK — old "cat2" look)
   - item      : a specific piece with a price, sold at a shop (renders blue)
   - `spaceType` is REMOVED. The retail subtype (boutique, vintage_store…) is parked in data.shopType so the info isn't lost; say the word and it goes too.
   - `itemKind` is REMOVED (schema field was deleted).
   - Neighbourhoods/streets are NOT facets — they stay as `area`-kind tags. (Kloosterstraat facet is dropped as redundant with the kloosterstraat tag.)
   - A shop is ONE thing: a product's `shop` is a slim reference {id, documentId, name} to the shop facet — no more duplicate shop-entity objects.
   - Edges reference endpoints as {id, documentId} stubs instead of embedding stale facet copies.
 
 Issues still honoured:
    1. products reach vibes through moodboards (vibe→moodboard→item); 
    2. no direct product↔vibe.
    3. every product has a shop.
 ***/
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(__dir, "../web/src/data/seed.json");
const DRY = process.argv.includes("--dry");
const seed = JSON.parse(readFileSync(SEED, "utf8"));
const STAMP = "2026-06-15T00:00:00.000Z";
const norm = (s) => (s || "").trim().toLowerCase();
const rpt = { removedFacets: [], shopsCreated: [], moodboardsAdded: [], edgesRemoved: 0, edgesAdded: 0, edgesSlimmed: 0 };

/*** 0. drop facets that should not exist (streets/areas = tags) ***/
const REMOVE_TITLES = new Set(["kloosterstraat"]);
seed.facets = seed.facets.filter((f) => {
  if (REMOVE_TITLES.has(norm(f.title))) { rpt.removedFacets.push(f.title); return false; }
  return true;
});
const facets = seed.facets;
const byTitle = (t) => facets.find((f) => norm(f.title) === norm(t));

/*** 1. venues -> type:"shop"; markets too; park subtype; strip spaceType/itemKind ***/
const MARKET_SHOPTYPE = { "sint-jansvliet vintage market": "flea_market" };
for (const f of facets) {
  const wasVenue = f.type === "item" && f.spaceType != null;
  const isMarket = f.type === "item" && MARKET_SHOPTYPE[norm(f.title)];
  if (wasVenue || isMarket) {
    const shopType = f.spaceType || MARKET_SHOPTYPE[norm(f.title)] || null;
    f.type = "shop";
    f.price = null;
    if (shopType) f.data = { ...(f.data || {}), shopType };
  }
}
// strip the now-defunct fields everywhere (recursive: facets + any nested)
function strip(node) {
  if (Array.isArray(node)) return node.forEach(strip);
  if (node && typeof node === "object") {
    delete node.spaceType;
    delete node.itemKind;
    Object.values(node).forEach(strip);
  }
}
seed.facets.forEach(strip);

/*** 2. create shop facets for shops referenced by products but missing ***/
let nextId = Math.max(...facets.map((f) => f.id)) + 1;
function ensureShopFacet(name, shopType, desc) {
  let f = byTitle(name);
  if (f) return f;
  f = {
    id: nextId++, documentId: `shop_${norm(name).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
    title: name, subtitle: desc || null, type: "shop", price: null, availability: "available",
    embedding: null, data: shopType ? { shopType } : null, createdAt: STAMP, updatedAt: STAMP,
    publishedAt: STAMP, tags: [], curator: null, shop: null, media: null,
  };
  facets.push(f);
  rpt.shopsCreated.push(`${name} (${shopType || "—"})`);
  return f;
}
ensureShopFacet("My Ohm", "boutique", "Leather accessories — boots and bags");
ensureShopFacet("Camden", "vintage_store", "Bold punk/rock/alternative vintage in the fashion district");

/*** 3. consolidate: product.shop -> slim ref to the ONE shop facet ***/
const PRODUCT_SHOP = {
  "Leather jacket": "Think Twice", "Vintage windbreaker": "Think Twice",
  "Pleated midi skirt": "Rosier 41", "Studded leather belt": "My Ohm",
  "Faded band tee": "Camden", "Cowboy boots": "My Ohm",
  "Arte Logo Hoodie": "Arte Antwerp", "Skate Graphic Tee": "VIER",
  "Asymmetric Black Shirt": "Ann Demeulemeester", "Vintage Wool Overcoat": "Rosier 41",
  "Retro Denim Jacket": "Episode", "Organic Cotton Knit": "Supergoods",
};
const isProduct = (f) => f.type === "item" && f.price != null;
for (const [productTitle, shopName] of Object.entries(PRODUCT_SHOP)) {
  const p = byTitle(productTitle), s = byTitle(shopName);
  if (p && s) p.shop = { id: s.id, documentId: s.documentId, name: s.title };
}

/*** 4. moodboards + edge rewire (issue 1) ***/
const V = { coffee: "Coffee & Vinyl", dark: "Dark Avant-Garde", street: "Streetwear",
  eclectic: "Eclectic & Print-Driven", slow: "Conscious Slow Fashion", vintage: "Curated Vintage & Era-Specific" };
const MOODBOARDS = [
  { title: "Actually cheap vintage jackets", vibe: V.vintage },
  { title: "Nightlife Fits", vibe: V.dark }, { title: "90s Sportswear", vibe: V.street },
  { title: "Denim Revival", vibe: V.vintage }, { title: "Skater Boy Aesthetics", vibe: V.street },
  { title: "Alternative Edge", vibe: V.dark }, { title: "Graphic Tees & Flannels", vibe: V.vintage },
  { title: "Gorpcore Essentials", vibe: V.street }, { title: "Monochrome Layers", vibe: V.dark },
  { title: "Future Utility", vibe: V.street }, { title: "Cyberpunk Silhouette", vibe: V.dark },
  { title: "Café Crate-Digging", vibe: V.coffee }, { title: "Print & Pattern Play", vibe: V.eclectic },
  { title: "Slow & Natural", vibe: V.slow },
];
let mbN = 1;
const mbOf = new Map();
for (const m of MOODBOARDS) {
  let f = byTitle(m.title);
  if (!f) {
    f = { id: nextId++, documentId: `moodboard_${String(++mbN).padStart(2, "0")}`, title: m.title,
      subtitle: null, type: "moodboard", price: null, availability: null, embedding: null, data: null,
      createdAt: STAMP, updatedAt: STAMP, publishedAt: STAMP, tags: [], curator: null, shop: null, media: null };
    facets.push(f);
    rpt.moodboardsAdded.push(`${m.title} → ${m.vibe}`);
  }
  mbOf.set(m.title, f);
}
const PRODUCT_MB = {
  "Leather jacket": "Actually cheap vintage jackets", "Vintage windbreaker": "Actually cheap vintage jackets",
  "Pleated midi skirt": "Denim Revival", "Studded leather belt": "Alternative Edge",
  "Faded band tee": "Graphic Tees & Flannels", "Cowboy boots": "Denim Revival",
  "Arte Logo Hoodie": "90s Sportswear", "Skate Graphic Tee": "Skater Boy Aesthetics",
  "Asymmetric Black Shirt": "Monochrome Layers", "Vintage Wool Overcoat": "Monochrome Layers",
  "Retro Denim Jacket": "Denim Revival", "Organic Cotton Knit": "Slow & Natural",
};

/*** 5. rebuild edges: slim to stubs, drop dangling, remove product↔vibe, add new ***/
const liveDocs = new Set(facets.map((f) => f.documentId));
const facetByDoc = new Map(facets.map((f) => [f.documentId, f]));
const typeOf = (doc) => facetByDoc.get(doc)?.type;
const isProd = (doc) => { const f = facetByDoc.get(doc); return f && f.type === "item" && f.price != null; };

let edges = seed.edges
  .map((e) => {
    const s = e.source?.documentId, t = e.target?.documentId;
    rpt.edgesSlimmed++;
    return { id: e.id, documentId: e.documentId, relationType: e.relationType, weight: e.weight ?? 1,
      origin: e.origin ?? "curator_confirmed", source: { documentId: s }, target: { documentId: t } };
  })
  .filter((e) => liveDocs.has(e.source.documentId) && liveDocs.has(e.target.documentId));

/*** Vibe clusters ONLY receive connections from moodboards. Drop every vibe edge whose partner is not a moodboard (vibe↔shop, vibe↔item, vibe↔vibe all go). ***/
const before = edges.length;
edges = edges.filter((e) => {
  const a = typeOf(e.source.documentId), b = typeOf(e.target.documentId);
  if (a !== "vibe" && b !== "vibe") return true;
  return new Set([a, b]).has("moodboard");
});
rpt.edgesRemoved = before - edges.length;

let nextEdge = Math.max(...edges.map((e) => e.id)) + 1;
const stub = (f) => ({ documentId: f.documentId });
const key = (s, t, rt) => `${s}|${t}|${rt}`;
const have = new Set(edges.map((e) => key(e.source.documentId, e.target.documentId, e.relationType)));
function addEdge(s, t, rt) {
  const k = key(s.documentId, t.documentId, rt);
  if (have.has(k)) return;
  have.add(k);
  edges.push({ id: nextEdge++, documentId: `edge_norm_${nextEdge}`, relationType: rt, weight: 1,
    origin: "curator_confirmed", source: stub(s), target: stub(t) });
  rpt.edgesAdded++;
}
for (const m of MOODBOARDS) { const mb = mbOf.get(m.title), v = byTitle(m.vibe); if (mb && v) addEdge(v, mb, "contains"); }
for (const [pt, mt] of Object.entries(PRODUCT_MB)) { const p = byTitle(pt), mb = mbOf.get(mt); if (p && mb) addEdge(mb, p, "contains"); }
// shop → product (item sold at shop) — connects shops (incl new My Ohm/Camden) into the graph
for (const [pt, sn] of Object.entries(PRODUCT_SHOP)) { const p = byTitle(pt), s = byTitle(sn); if (p && s) addEdge(s, p, "contains"); }
seed.edges = edges;

/*** write + report ***/
if (!DRY) writeFileSync(SEED, JSON.stringify(seed, null, 2) + "\n");
const c = (t) => facets.filter((f) => f.type === t).length;
console.log(`\n${DRY ? "DRY RUN — not written" : "✅ wrote " + SEED}`);
console.log(`\nFACET TYPES: vibe=${c("vibe")} moodboard=${c("moodboard")} shop=${c("shop")} item=${c("item")}`);
console.log(`removed facets (area→tag): ${rpt.removedFacets.join(", ") || "none"}`);
console.log(`shop facets created: ${rpt.shopsCreated.join(", ") || "none"}`);
console.log(`moodboards added: ${rpt.moodboardsAdded.length}`);
console.log(`edges: slimmed ${rpt.edgesSlimmed}, removed(product↔vibe/dangling) ${rpt.edgesRemoved}, added ${rpt.edgesAdded}, total ${seed.edges.length}`);

// sanity
const raw = JSON.stringify(seed);
console.log(`\nSANITY spaceType anywhere: ${raw.includes('"spaceType"')} (want false)`);
console.log(`SANITY itemKind anywhere: ${raw.includes('"itemKind"')} (want false)`);
console.log(`SANITY products w/o shop: ${facets.filter(isProduct).filter((f) => !f.shop).map((f) => f.title).join(", ") || "none"}`);
const dupShopEntities = facets.map((f) => f.shop).filter((s) => s && (s.lat !== undefined || s.hours !== undefined)).length;
console.log(`SANITY fat shop-entity objects left: ${dupShopEntities} (want 0)`);
const badVibe = seed.edges.filter((e) => {
  const a = typeOf(e.source.documentId), b = typeOf(e.target.documentId);
  return (a === "vibe" || b === "vibe") && !new Set([a, b]).has("moodboard");
}).length;
console.log(`SANITY non-moodboard↔vibe edges: ${badVibe} (want 0)`);
const vibeEdgeKinds = {};
seed.edges.forEach((e) => {
  const a = typeOf(e.source.documentId), b = typeOf(e.target.documentId);
  if (a === "vibe" || b === "vibe") { const other = a === "vibe" ? b : a; vibeEdgeKinds[other] = (vibeEdgeKinds[other] || 0) + 1; }
});
console.log(`        vibe edges by partner type: ${JSON.stringify(vibeEdgeKinds)}`);
const embeds = seed.edges.some((e) => Object.keys(e.source).length > 1 || Object.keys(e.target).length > 1);
console.log(`SANITY edges still embedding facets: ${embeds} (want false)`);
