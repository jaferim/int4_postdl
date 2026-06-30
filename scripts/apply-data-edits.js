/*** scripts/apply-data-edits.js ***

Applies the declarative corrections in scripts/data/data-edits.js to web/src/data/seed.json (the canonical dataset). Safe by design:
   - DRY_RUN defaults to true — prints a full preview and writes nothing
   - idempotent — re-running with no edits changes nothing
   - seed.json only — publish to Render afterwards with the usual:
     `DRY_RUN=false node import-seed-to-strapi.js` + `strapi transfer`
     node scripts/apply-data-edits.js                # preview
     DRY_RUN=false node scripts/apply-data-edits.js  # write seed.json

 Covers four facet types (item | shop | moodboard | vibe) for fields/tags/images, curator data (display fields synced from web/src/lib/curators.js,plus CURATOR_EDITS for API-only fields), and moodboard membership edges.

Unknown tag labels are warned + skipped by default (so you can't accidentally spawn duplicate tags). Pass ALLOW_NEW_TAGS=true to create them. ***/
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FACET_EDITS, CURATOR_EDITS, MEMBERSHIP } from "./data/data-edits.js";
import { CURATORS } from "../web/src/lib/curators.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(__dir, "../web/src/data/seed.json");
const DRY_RUN = process.env.DRY_RUN !== "false";
const ALLOW_NEW_TAGS = process.env.ALLOW_NEW_TAGS === "true";

const seed = JSON.parse(readFileSync(SEED, "utf8"));
const log = [];
const warn = (m) => log.push(`  ! ${m}`);
const note = (m) => log.push(`  • ${m}`);

/*** lookups ***/
const facetByTitle = new Map(seed.facets.map((f) => [f.title, f]));
const itemByTitle = new Map(seed.facets.filter((f) => f.type === "item").map((f) => [f.title, f]));
const moodboardByTitle = new Map(seed.facets.filter((f) => f.type === "moodboard").map((f) => [f.title, f]));

/*** tag pool: label -> a representative full tag object (cloned on use) ***/
const tagPool = new Map();
for (const f of seed.facets) for (const t of f.tags ?? []) if (t?.label && !tagPool.has(t.label)) tagPool.set(t.label, t);

const genDocId = () =>
  Array.from({ length: 24 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
let maxEdgeId = seed.edges.reduce((m, e) => Math.max(m, e.id ?? 0), 0);

/***resolve a list of tag labels to tag objects (reusing the pool; minting if allowed) ***/
function resolveTags(labels, ctx) {
  const out = [];
  for (const label of labels) {
    if (tagPool.has(label)) out.push({ ...tagPool.get(label) });
    else if (ALLOW_NEW_TAGS) {
      const fresh = { documentId: genDocId(), label, kind: "theme" };
      tagPool.set(label, fresh);
      out.push({ ...fresh });
      note(`${ctx}: created new tag "${label}" (kind: theme)`);
    } else warn(`${ctx}: unknown tag "${label}" — skipped (set ALLOW_NEW_TAGS=true to create)`);
  }
  return out;
}

/*** 1. FACET_EDITS ***/
log.push("\n# Facet edits");
let facetChanges = 0;
for (const [title, edit] of Object.entries(FACET_EDITS)) {
  const f = facetByTitle.get(title);
  if (!f) { warn(`"${title}" not found in seed — skipped`); continue; }
  const before = JSON.stringify(f);

  if (edit.subtitle !== undefined) f.subtitle = edit.subtitle;
  if (edit.shopType !== undefined) { f.data = f.data || {}; f.data.shopType = edit.shopType; }
  if (edit.data && typeof edit.data === "object") f.data = { ...(f.data || {}), ...edit.data };
  if (Array.isArray(edit.images)) {
    const urls = edit.images.filter((u) => typeof u === "string" && u.trim());
    f.data = f.data || {};
    f.data.imageUrls = urls;
  }

  if (Array.isArray(edit.setTags)) {
    f.tags = resolveTags(edit.setTags, `"${title}"`);
  } else {
    if (Array.isArray(edit.addTags)) {
      const have = new Set((f.tags ?? []).map((t) => t.label));
      const additions = resolveTags(edit.addTags.filter((l) => !have.has(l)), `"${title}"`);
      f.tags = [...(f.tags ?? []), ...additions];
    }
    if (Array.isArray(edit.removeTags)) {
      const drop = new Set(edit.removeTags);
      f.tags = (f.tags ?? []).filter((t) => !drop.has(t.label));
    }
  }

  if (JSON.stringify(f) !== before) {
    facetChanges++;
    note(`${f.type} "${title}" updated (${[
      edit.subtitle !== undefined && "subtitle",
      (edit.shopType !== undefined || edit.data) && "data",
      Array.isArray(edit.images) && "images",
      (edit.addTags || edit.removeTags || edit.setTags) && "tags",
    ].filter(Boolean).join(", ")})`);
  }
}
if (!facetChanges) log.push("  (none)");

/*** 2. CURATORS: sync display fields from curators.js, then CURATOR_EDITS ***/
log.push("\n# Curators");
// map: curators.js field -> seed curator field
const SYNC = { name: "name", handle: "handle", subculture: "subculture", tone: "tone", bio: "bio", avatar: "avatarUrl" };
const copiesBySlug = new Map();
for (const f of seed.facets) {
  const c = f.curator;
  if (c?.slug) (copiesBySlug.get(c.slug) ?? copiesBySlug.set(c.slug, []).get(c.slug)).push(c);
}
const curatorSlugs = new Set([...CURATORS.map((c) => c.slug), ...Object.keys(CURATOR_EDITS)]);
for (const slug of curatorSlugs) {
  const copies = copiesBySlug.get(slug) ?? [];
  if (!copies.length) { warn(`curator "${slug}" has no copies in seed — skipped`); continue; }
  const fromJs = CURATORS.find((c) => c.slug === slug);
  const changed = new Set();
  for (const copy of copies) {
    if (fromJs) for (const [src, dst] of Object.entries(SYNC)) {
      if (fromJs[src] !== undefined && copy[dst] !== fromJs[src]) { copy[dst] = fromJs[src]; changed.add(dst); }
    }
    for (const [k, v] of Object.entries(CURATOR_EDITS[slug] ?? {})) {
      if (copy[k] !== v) { copy[k] = v; changed.add(k); }
    }
  }
  if (changed.size) note(`"${slug}" → ${copies.length} copies: ${[...changed].join(", ")}`);
}

/*** 3. MEMBERSHIP (contains edges: moodboard → item) ***
NB: items also sit in a SHOP via a contains edge (shop → item). Single-membership applies only to MOODBOARDS, so we scope to moodboard-sourced edges. Otherwise moving an item between moodboards would sever its shop link. ***/
log.push("\n# Moodboard membership");
const moodboardIds = new Set([...moodboardByTitle.values()].map((m) => m.documentId));
const containsFor = (mbId, itemId) =>
  seed.edges.find((e) => e.relationType === "contains" && e.source?.documentId === mbId && e.target?.documentId === itemId);
let membershipChanges = 0;
for (const [mbTitle, ops] of Object.entries(MEMBERSHIP)) {
  const mb = moodboardByTitle.get(mbTitle);
  if (!mb) { warn(`moodboard "${mbTitle}" not found — skipped`); continue; }
  for (const itemTitle of ops.add ?? []) {
    const item = itemByTitle.get(itemTitle);
    if (!item) { warn(`item "${itemTitle}" not found — skipped`); continue; }
    // contains edges pointing at this item FROM a moodboard, split by which one.
    const existing = seed.edges.filter(
      (e) => e.relationType === "contains" && e.target?.documentId === item.documentId
        && moodboardIds.has(e.source?.documentId),
    );
    const alreadyHere = existing.find((e) => e.source?.documentId === mb.documentId);
    const elsewhere = existing.filter((e) => e.source?.documentId !== mb.documentId);
    // Already correctly placed and nowhere else → genuine no-op (keeps the run idempotent).
    if (alreadyHere && elsewhere.length === 0) continue;
    // single-membership: drop only the edges pointing at OTHER moodboards…
    if (elsewhere.length) seed.edges = seed.edges.filter((e) => !elsewhere.includes(e));
    // …and keep the existing correct edge if present, only minting one when missing (so an item's edge id/documentId stay stable across re-runs).
    if (!alreadyHere) {
      seed.edges.push({
        id: ++maxEdgeId, documentId: genDocId(), relationType: "contains", weight: 1, origin: "manual",
        source: { documentId: mb.documentId }, target: { documentId: item.documentId },
      });
    }
    membershipChanges++;
    note(`+ "${itemTitle}" → "${mbTitle}"${elsewhere.length ? ` (moved from ${elsewhere.length} other)` : ""}`);
  }
  for (const itemTitle of ops.remove ?? []) {
    const item = itemByTitle.get(itemTitle);
    if (!item) { warn(`item "${itemTitle}" not found — skipped`); continue; }
    const edge = containsFor(mb.documentId, item.documentId);
    if (!edge) { warn(`"${itemTitle}" is not in "${mbTitle}" — nothing to remove`); continue; }
    seed.edges = seed.edges.filter((e) => e !== edge);
    membershipChanges++;
    note(`- "${itemTitle}" from "${mbTitle}"`);
  }
}
if (!membershipChanges) log.push("  (none)");

/*** report + write ***/
console.log(log.join("\n"));
console.log(`\nSeed now: ${seed.facets.length} facets, ${seed.edges.length} edges, ${tagPool.size} distinct tags.`);

if (DRY_RUN) {
  console.log("\nDRY RUN — nothing written. Re-run with DRY_RUN=false to apply.");
  process.exit(0);
}
writeFileSync(SEED, JSON.stringify(seed, null, 2) + "\n");
console.log("\n✓ Wrote web/src/data/seed.json");
console.log("  Publish to Render: DRY_RUN=false node import-seed-to-strapi.js  then  strapi transfer (from cms/).");
