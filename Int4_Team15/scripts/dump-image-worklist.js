/*** dump-image-worklist.js ***

Reads web/src/data/seed.json and writes a CSV worklist for Victoria/me so we can source images for each facet WITHOUT touching Strapi or the code.

  node dump-image-worklist.js → scripts/out/image-worklist.csv

Open the CSV in Google Sheets, fill imageURL1..imageURL5 per row, export it back to CSV. apply-images-to-seed.js takes it from there.

Read-only: this only reads seed.json and writes one local CSV file. Safe. No DRY_RUN needed. ***/

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = resolve(__dir, "../web/src/data/seed.json");
const OUT_DIR = resolve(__dir, "out");
const OUT_PATH = resolve(OUT_DIR, "image-worklist.csv");

// item facets need a minimum of 3 images for the hover collage (Idris's rule).
const MIN_IMAGES_FOR_ITEM = 3;

// Plain, literal headers — Victoria reads these. No idioms.
const HEADERS = [
  "documentId",
  "type",
  "title",
  "subtitle",
  "tags",
  "curator",
  "spaceType",
  "imageCount",
  "imageURL1",
  "imageURL2",
  "imageURL3",
  "imageURL4",
  "imageURL5",
  "notes",
];

// Wrap a value for CSV: always quote, and double any inner quotes (RFC 4180).
function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function csvRow(cells) {
  return cells.map(csvCell).join(",");
}

/*** How many images does this facet already have? (so we see what's missing) ***/
function existingImageCount(facet) {
  const fromData = Array.isArray(facet.data?.imageUrls)
    ? facet.data.imageUrls.length
    : 0;
  const fromMedia = Array.isArray(facet.media) ? facet.media.length : 0;
  // imageUrls is the collage source of truth; fall back to the media count.
  return fromData || fromMedia || 0;
}

function main() {
  const seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  const facets = seed.facets ?? [];

/*** Sort so we can work one subculture cluster at a time: ***
by curator name, then type, then title. ***/
  const sorted = [...facets].sort((a, b) => {
    const ca = a.curator?.name ?? "~"; // facets with no curator sink to the end
    const cb = b.curator?.name ?? "~";
    return (
      ca.localeCompare(cb) ||
      (a.type ?? "").localeCompare(b.type ?? "") ||
      (a.title ?? "").localeCompare(b.title ?? "")
    );
  });

  const lines = [csvRow(HEADERS)];

  for (const f of sorted) {
    const tags = (f.tags ?? []).map((t) => t.label).join(", ");
    const count = existingImageCount(f);

    // Pre-fill the notes column with the requirement so she sees it per row.
    let notes = "";
    if (f.type === "item") {
      notes = `Needs at least ${MIN_IMAGES_FOR_ITEM} images (fill imageURL1-3).`;
    } else {
      notes = `Optional for now (${f.type}) - team to decide treatment.`;
    }

    lines.push(
      csvRow([
        f.documentId,
        f.type,
        f.title,
        f.subtitle,
        tags,
        f.curator?.name,
        f.spaceType,
        count,
        "", // imageURL1 
        "", // imageURL2
        "", // imageURL3
        "", // imageURL4 (optional)
        "", // imageURL5 (optional)
        notes,
      ]),
    );
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, lines.join("\n") + "\n", "utf8");

  const itemCount = facets.filter((f) => f.type === "item").length;
  console.log(`\n📋 image worklist written → ${OUT_PATH}`);
  console.log(`   ${facets.length} facets total (${itemCount} item facets need ≥ ${MIN_IMAGES_FOR_ITEM} images each).`);
  console.log(`   Open it in Google Sheets, fill imageURL1-3 per item, export back to CSV.\n`);
}

main();
