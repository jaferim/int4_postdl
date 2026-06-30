/* scripts/reassign-curators-by-moodboard.js
 *
 * Aligns each ITEM's curator with the moodboard it lives in. The rule is simple
 * and principled: an item is curated by whoever curates its moodboard. The
 * moodboards already carry the correct owning-curator embed (it matches
 * web/src/lib/curators.js exactly), so we just copy that embed onto the items in
 * the moodboard. This fixes the old, arbitrary item->curator assignment (which
 * left Fleur with zero items even though she owns two moodboards) and makes the
 * curators genuinely curate the pieces in their boards.
 *
 * Safe by design, same contract as apply-data-edits.js:
 *   - DRY_RUN defaults to true — prints a full preview and writes nothing
 *   - idempotent — re-running changes nothing once aligned
 *   - seed.json only — publish to Render afterwards with the usual
 *     `DRY_RUN=false node import-seed-to-strapi.js` + `strapi transfer`
 *
 *     node scripts/reassign-curators-by-moodboard.js                # preview
 *     DRY_RUN=false node scripts/reassign-curators-by-moodboard.js  # write seed.json
 *
 * Only `item` facets are touched (their `curator` embed). Moodboards, shops and
 * vibes keep whatever curator they already have.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(__dir, "../web/src/data/seed.json");
const DRY_RUN = process.env.DRY_RUN !== "false";

const seed = JSON.parse(readFileSync(SEED, "utf8"));
const log = [];
const warn = (m) => log.push(`  ! ${m}`);
const note = (m) => log.push(`  • ${m}`);

// ── lookups ──────────────────────────────────────────────────────────────────
const byId = new Map(seed.facets.map((f) => [f.documentId, f]));
const isMoodboard = (id) => byId.get(id)?.type === "moodboard";
const isItem = (id) => byId.get(id)?.type === "item";

// item documentId -> the moodboard documentId it belongs to (via `contains`).
// Edges are normally stored moodboard(source) -> item(target), but we check both
// ends so a flipped edge can't silently drop an item. Single-membership is the
// rule, so we warn (and keep the first) if an item somehow sits in two.
const moodboardOfItem = new Map();
for (const e of seed.edges) {
  if (e.relationType !== "contains") continue;
  const s = e.source?.documentId;
  const t = e.target?.documentId;
  let mbId, itemId;
  if (isMoodboard(s) && isItem(t)) [mbId, itemId] = [s, t];
  else if (isMoodboard(t) && isItem(s)) [mbId, itemId] = [t, s];
  else continue;
  if (moodboardOfItem.has(itemId) && moodboardOfItem.get(itemId) !== mbId) {
    warn(
      `item "${byId.get(itemId)?.title}" is in >1 moodboard — keeping "${byId.get(moodboardOfItem.get(itemId))?.title}"`,
    );
    continue;
  }
  moodboardOfItem.set(itemId, mbId);
}

// ── reassign ──────────────────────────────────────────────────────────────────
log.push("\n# Item curator <- moodboard owner");
const items = seed.facets.filter((f) => f.type === "item");
let changes = 0;
let orphans = 0;
const dist = new Map(); // curator name -> count (resulting)

for (const item of items) {
  const mbId = moodboardOfItem.get(item.documentId);
  const mb = mbId ? byId.get(mbId) : null;
  const owner = mb?.curator;
  if (!owner?.slug) {
    orphans++;
    warn(`"${item.title}" has no moodboard owner — left as-is (${item.curator?.name ?? "none"})`);
    continue;
  }
  dist.set(owner.name, (dist.get(owner.name) ?? 0) + 1);
  const fromName = item.curator?.name ?? "none";
  // Already aligned (same curator documentId) → no-op, keeps the run idempotent.
  if (item.curator?.documentId === owner.documentId) continue;
  // Deep-copy so each item owns its curator object (matching how the seed stores
  // a per-facet embed, not a shared reference).
  item.curator = JSON.parse(JSON.stringify(owner));
  changes++;
  note(`"${item.title}": ${fromName} → ${owner.name}  (moodboard "${mb.title}")`);
}
if (!changes) log.push("  (already aligned — nothing to change)");

// ── report + write ────────────────────────────────────────────────────────────
console.log(log.join("\n"));
console.log(
  `\n${items.length} items: ${changes} reassigned, ${orphans} without a moodboard owner.`,
);
console.log("Resulting curator distribution:");
for (const [name, n] of [...dist.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name}: ${n}`);
}

if (DRY_RUN) {
  console.log("\nDRY RUN — nothing written. Re-run with DRY_RUN=false to apply.");
  process.exit(0);
}
writeFileSync(SEED, JSON.stringify(seed, null, 2) + "\n");
console.log("\n✓ Wrote web/src/data/seed.json");
console.log(
  "  Publish to Render: DRY_RUN=false node import-seed-to-strapi.js  then  strapi transfer (from cms/).",
);
