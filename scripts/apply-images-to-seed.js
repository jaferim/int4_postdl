/*** apply-images-to-seed.js ***

Applies Victoria's filled worklist DIRECTLY to web/src/data/seed.json — the canonical dataset (§11). Writing images into the seed (rather than into Strapi) means the next import-seed-to-strapi.js → strapi transfer carries them up instead of clobbering them.

Per filled row (matched to a facet by documentId):
   1. download each imageURLn, optimise (sharp, ≤1024px, JPEG q80)
   2. save to web/public/facets/<slug>-<n>.jpg  (deterministic; reruns overwrite)
   3. set facet.data.imageUrls = [ordered web paths]  in seed.json

Auto-detects ',' vs ';' delimiter. Rows whose documentId isn't in seed.json are skipped (reported). e.g. the removed Kloosterstraat.
  node apply-images-to-seed.js    # DRY RUN — no downloads, no writes
  DRY_RUN=false node apply-images-to-seed.js   # real run
  WORKLIST=scripts/out/foo.csv DRY_RUN=false node apply-images-to-seed.js ***/
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dir = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(__dir, "../web/src/data/seed.json");
const WORKLIST = process.env.WORKLIST
  ? resolve(process.cwd(), process.env.WORKLIST)
  : resolve(__dir, "out/image-worklist-filled.csv");
const PUBLIC_FACETS_DIR = resolve(__dir, "../web/public/facets");
const WEB_PREFIX = "/facets";
const DRY_RUN = process.env.DRY_RUN !== "false";
const MAX_EDGE = 1024;
const MAX_URL_COLUMNS = 5;

// minimal CSV parser (quoted fields, "" escape, configurable delimiter)
function parseCsv(text, delim) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
      continue;
    }
    if (c === '"') q = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); field = ""; rows.push(row); row = []; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
const slugify = (s) => String(s || "").toLowerCase().normalize("NFKD")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");

async function downloadAndOptimise(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf).resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 }).toFile(destPath);
}

async function main() {
  if (!existsSync(WORKLIST)) throw new Error(`Worklist not found: ${WORKLIST}`);
  const raw = readFileSync(WORKLIST, "utf8").replace(/^﻿/, "");
  const delim = (raw.split("\n")[0].match(/;/g)?.length || 0) > (raw.split("\n")[0].match(/,/g)?.length || 0) ? ";" : ",";
  const rows = parseCsv(raw, delim);
  const header = rows[0].map((h) => h.trim());
  const col = (n) => header.indexOf(n);
  const iDoc = col("documentId"), iTitle = col("title");
  const urlCols = [];
  for (let n = 1; n <= MAX_URL_COLUMNS; n++) { const ix = col(`imageURL${n}`); if (ix >= 0) urlCols.push(ix); }

  const seed = JSON.parse(readFileSync(SEED, "utf8"));
  const byDoc = new Map(seed.facets.map((f) => [f.documentId, f]));

  console.log(`\n🖼  apply-images-to-seed  ${DRY_RUN ? "(DRY RUN)" : "→ LIVE"}  delimiter='${delim}'`);
  console.log(`   worklist: ${WORKLIST}\n`);
  if (!DRY_RUN) mkdirSync(PUBLIC_FACETS_DIR, { recursive: true });

  let applied = 0; const skipped = [];
  for (const r of rows.slice(1)) {
    const documentId = (r[iDoc] || "").trim();
    const title = (r[iTitle] || "").trim();
    const urls = urlCols.map((ix) => (r[ix] || "").trim()).filter(Boolean);
    if (!urls.length) continue;
    const facet = byDoc.get(documentId);
    if (!facet) { skipped.push(`${title || documentId} (no matching facet)`); continue; }

    const slug = slugify(title) || documentId.slice(0, 8);
    const webPaths = [];
    for (let n = 0; n < urls.length; n++) {
      const fileName = `${slug}-${n + 1}.jpg`;
      const webPath = `${WEB_PREFIX}/${fileName}`;
      if (DRY_RUN) { console.log(`  ◦ ${title}: would fetch ${urls[n].slice(0, 60)}… → ${webPath}`); }
      else {
        try { await downloadAndOptimise(urls[n], resolve(PUBLIC_FACETS_DIR, fileName)); console.log(`  ✓ ${fileName}`); }
        catch (e) { console.log(`  ✗ ${fileName} (${e.message})`); continue; }
      }
      webPaths.push(webPath);
    }
    if (webPaths.length) { facet.data = { ...(facet.data || {}), imageUrls: webPaths }; applied++; }
  }

  if (!DRY_RUN) writeFileSync(SEED, JSON.stringify(seed, null, 2) + "\n");
  console.log(`\n──────── summary ────────`);
  console.log(`facets given images: ${applied}`);
  console.log(`skipped (no matching facet): ${skipped.length ? skipped.join(", ") : "none"}`);
  console.log(DRY_RUN ? `\nDry run — nothing downloaded/written. Re-run: DRY_RUN=false node scripts/apply-images-to-seed.js\n`
    : `\n✅ seed.json updated. graph.js exposes node.images from data.imageUrls.\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
