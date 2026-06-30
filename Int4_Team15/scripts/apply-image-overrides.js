/*** scripts/apply-image-overrides.js ***

Applies your hand-picked images from scripts/data/image-overrides.js to:
    1. web/src/data/seed.json   (the git-versioned backup / offline-dev copy), and
    2. a running Strapi         (so the live site updates) — target via STRAPI_URL.
 
 It only touches each item's data.imageUrls; material/condition/brand/sizes are preserved.
 
 Items whose array you left unchanged (still the /facets/... defaults) are skipped, so you can curate a few at a time. Match is by item title.

 node scripts/apply-image-overrides.js    # DRY RUN — shows what would change
 DRY_RUN=false node scripts/apply-image-overrides.js    # write seed.json + push to STRAPI_URL
 Where it pushes (Strapi side):
    - default: http://localhost:1337 with scripts/.env STRAPI_TOKEN — then re-transfer to Render.
    - direct to Render (no transfer): create a Render API token (admin -> Settings -> API Tokens, full access) and run with:
      STRAPI_URL=https://int4-team15.onrender.com STRAPI_TOKEN=<render-token>
      DRY_RUN=false node scripts/apply-image-overrides.js

Skip the Strapi push entirely (only update the seed backup): PUSH_STRAPI=false ***/
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { IMAGE_OVERRIDES } from "./data/image-overrides.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(__dir, "../web/src/data/seed.json");
const DRY_RUN = process.env.DRY_RUN !== "false";
const PUSH_STRAPI = process.env.PUSH_STRAPI !== "false";
const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const TOKEN = process.env.STRAPI_TOKEN;

const seed = JSON.parse(readFileSync(SEED, "utf8"));
const itemByTitle = new Map(seed.facets.filter((f) => f.type === "item").map((f) => [f.title, f]));

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Work out which overrides actually change something (non-empty + different from current).
const changes = [];
for (const [title, urls] of Object.entries(IMAGE_OVERRIDES)) {
  const item = itemByTitle.get(title);
  if (!item) {
    console.warn(`! "${title}" not found in seed — skipped`);
    continue;
  }
  const clean = (urls || []).filter((u) => typeof u === "string" && u.trim());
  if (!clean.length || same(clean, item.data?.imageUrls || [])) continue; // untouched
  changes.push({ title, item, urls: clean });
}

console.log(`${changes.length} item(s) have new images:`);
for (const c of changes) console.log(`  ${c.title} → ${c.urls.length} img(s)`);

if (!changes.length) {
  console.log("\nNothing to apply — edit the arrays in scripts/data/image-overrides.js first.");
  process.exit(0);
}
if (DRY_RUN) {
  console.log("\nDRY RUN — nothing written. Re-run with DRY_RUN=false to apply.");
  process.exit(0);
}

/*** 1. update the seed.json backup ***/
for (const c of changes) {
  c.item.data = c.item.data || {};
  c.item.data.imageUrls = c.urls;
}
writeFileSync(SEED, JSON.stringify(seed, null, 2) + "\n");
console.log(`\n✓ Updated web/src/data/seed.json (${changes.length} items)`);

/*** 2. push to the live Strapi ***/
if (!PUSH_STRAPI) {
  console.log("PUSH_STRAPI=false — seed only. (Re-import + transfer when ready.)");
  process.exit(0);
}
if (!TOKEN) {
  console.warn("No STRAPI_TOKEN — skipped the Strapi push. seed.json is updated; set a token to push.");
  process.exit(0);
}

const headers = { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` };
let pushed = 0;
for (const c of changes) {
  // find the live facet by title, merge imageUrls into its existing data blob, PUT it back
  const res = await fetch(
    `${STRAPI_URL}/api/facets?filters[title][$eq]=${encodeURIComponent(c.title)}&filters[type][$eq]=item`,
    { headers },
  );
  const found = (await res.json()).data?.[0];
  if (!found) {
    console.warn(`! "${c.title}" not found on ${STRAPI_URL} — skipped`);
    continue;
  }
  const mergedData = { ...(found.data || {}), imageUrls: c.urls };
  const put = await fetch(`${STRAPI_URL}/api/facets/${found.documentId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ data: { data: mergedData } }),
  });
  if (!put.ok) {
    console.warn(`! PUT "${c.title}" failed: ${put.status} ${await put.text()}`);
    continue;
  }
  pushed++;
}
console.log(`✓ Pushed ${pushed}/${changes.length} items to ${STRAPI_URL}`);
console.log(
  STRAPI_URL.includes("localhost")
    ? "\nLocal Strapi updated. Re-transfer to Render to make it live."
    : "\nLive Strapi updated directly — done.",
);
