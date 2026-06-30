/*** scripts/embed-and-link.js ***

SCRIPT 2 — build "similar" Edges between Facets using LOCAL Ollama embeddings.

In plain English, it:
   1. Gets every Facet (title + subtitle) from local Strapi.
   2. Turns each Facet's text into an "embedding" — a list of numbers that captures its meaning — using a local Ollama model. All facets go up in ONE request (Ollama returns one vector per text, same order), so a full run is one call. These vectors stay IN MEMORY only; we never store them anywhere.
   3. Compares every pair of facets with cosine similarity (1.0 = identical meaning).
   4. For each facet, keeps only its TOP 3 most-similar neighbours. This keeps the graph sparse and protects our cloud free-plan entry cap (edges are the risk).
   5. Creates one "similar" Edge per kept pair (skipping self-pairs and duplicates).

Why Ollama: the Gemini free tier is unavailable in the EU (paid "standard" tier with a €10 minimum). Ollama runs the embedding model on your Mac — no account, no key, no billing.

Setup once:
   brew install ollama && brew services start ollama && ollama pull nomic-embed-text

Safety: DRY_RUN is TRUE by default. In dry-run mode NO model calls are made — it just lists the facets found in Strapi.

Run for real with:  DRY_RUN=false node embed-and-link.js   (or `npm run embed`)
***/

import "dotenv/config";
import { strapiGetAll, strapiCreate } from "./strapi.js";

/*** Settings ***/
const DRY_RUN = process.env.DRY_RUN !== "false";
// Local Ollama embedding model. nomic-embed-text is small, fast, and solid for semantic similarity. Override with OLLAMA_EMBED_MODEL / OLLAMA_URL in .env.
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const TOP_N = 3; // nearest neighbours to keep per facet

/*** Helper: embed an array of texts via local Ollama ***

Uses /api/embed, which accepts a batch ("input" array) and returns one vector per text in the SAME order. No API key; it's localhost. ***/
async function embed(texts) {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Ollama responded ${res.status}. Is it running? (brew services start ollama` +
        `, ollama pull ${EMBED_MODEL}). ${detail}`
    );
  }
  const data = await res.json();
  return data.embeddings; // array of vectors, aligned with `texts`
}

/*** Math helper: cosine similarity between two vectors*** 
 Returns a number from -1 to 1; higher = closer in meaning.***/
function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/*** Main ***/
async function main() {
  console.log(`\n🔗 embed-and-link.js   (DRY_RUN = ${DRY_RUN})\n`);

  // 1. All facets.
  const facets = await strapiGetAll("facets");
  console.log(`Found ${facets.length} facets.\n`);

  // In dry-run mode we skip ALL model calls. Just show what Strapi has.
  if (DRY_RUN) {
    console.log("Dry run — no model calls made. Facets that would be embedded:\n");
    for (const facet of facets) {
      console.log(`  • ${facet.title ?? "(untitled)"}  —  ${facet.subtitle ?? "(no subtitle)"}`);
    }
    console.log("\n✅ Dry run complete. Run with DRY_RUN=false to actually embed + create edges.\n");
    return;
  }

  // 2. Embed ALL facets in ONE request (only reached when DRY_RUN=false). Ollama's /api/embed takes an array of texts and returns vectors in the SAME order, so embeddings[i] lines up with facets[i]. One call for the whole batch, runs locally, free. Vectors stay in memory.
  console.log(`Calling local model (${EMBED_MODEL}) once to embed all facets...\n`);

  const texts = facets.map((f) => `${f.title ?? ""}\n${f.subtitle ?? ""}`.trim());

  const vectors = await embed(texts);

  const items = facets.map((facet, i) => ({
    documentId: facet.documentId,
    title: facet.title ?? "(untitled)",
    vector: vectors[i],
  }));
  console.log(`  embedded ${items.length} facets in 1 request.`);

  // 3 + 4. For each facet, score it against all others and keep the top N. We collect kept pairs in a Map keyed by a SORTED pair of ids, so the same pair (A-B vs B-A) is only ever stored once.


  /*** Hardening: load the edges that ALREADY exist (source/target populated) and build a set of their undirected id-pairs. ***
  We skip any pair that's already connected, so re-running never DUPLICATES edges (which would bloat the canvas and eat into the cloud free-plan entry cap). This script only ever appends. Without this guard, a second run doubles every "similar" edge it made before. ***/
  const existingEdges = await strapiGetAll("edges", "populate=*");
  const existingPairs = new Set(
    existingEdges
      .map((e) => [e.source?.documentId, e.target?.documentId])
      .filter(([a, b]) => a && b)
      .map(([a, b]) => [a, b].sort().join("|")),
  );
  console.log(`  ${existingPairs.size} pairs already linked — those will be skipped.\n`);

  const keptPairs = new Map(); // "docA|docB" -> { a, b, titleA, titleB, score }
  let skippedExisting = 0;

  for (let i = 0; i < items.length; i++) {
    const scores = [];
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue; // never link a facet to itself
      scores.push({ j, score: cosineSimilarity(items[i].vector, items[j].vector) });
    }
    scores.sort((x, y) => y.score - x.score); // most similar first
    for (const { j, score } of scores.slice(0, TOP_N)) {
      const a = items[i].documentId;
      const b = items[j].documentId;
      const key = [a, b].sort().join("|"); // sorted => undirected, dedupes A-B vs B-A
      if (existingPairs.has(key)) {
        skippedExisting += 1; // already connected in Strapi; don't duplicate
        continue;
      }
      if (!keptPairs.has(key)) {
        keptPairs.set(key, { a, b, titleA: items[i].title, titleB: items[j].title, score });
      }
    }
  }

  // 5. Create the edges. (We already returned early if DRY_RUN, so we're writing.)
  console.log(
    `\nKept ${keptPairs.size} NEW unique pairs (skipped ${skippedExisting} already-linked):\n`,
  );
  for (const { a, b, titleA, titleB, score } of keptPairs.values()) {
    console.log(`  ${titleA}  ↔  ${titleB}    (similarity ${score.toFixed(3)})`);

    // Edge.source / Edge.target are single relations → connect by documentId.
    // weight stores the similarity; origin "ai_suggested" marks it as machine-made.
    await strapiCreate("edges", {
      source: a,
      target: b,
      relationType: "similar",
      weight: Number(score.toFixed(4)),
      origin: "ai_suggested",
    });
  }

  console.log("\n✅ Done — edges created in local Strapi (1 local embedding call, $0).\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
