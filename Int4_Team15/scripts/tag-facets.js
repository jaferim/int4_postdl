/*** scripts/tag-facets.js ***
SCRIPT 1 — auto-tag every Facet using a LOCAL Ollama model (100% free, no API key).

In plain English, it:
  1. Asks Strapi for the full list of Tags that ALREADY exist.
  2. Asks Strapi for every Facet (we use its title + subtitle).
  3. Sends ALL facets to the local model in ONE request (numbered), with the allowed tag names, and asks it to pick ONLY the tags that fit each (never invent new ones). One request for the whole batch keeps it simple + fast.
  4. Maps the chosen tag names back to their IDs and attaches them to each Facet.

Why Ollama: the Gemini free tier is unavailable in the EU (every project lands on the paid "standard" tier with a €10 minimum). Ollama runs the model on your Mac — no account, no key, no billing, no rate limits. 

Setup once: brew install ollama && brew services start ollama && ollama pull qwen2.5:7b

Safety: DRY_RUN is TRUE by default. In dry-run mode NO model calls are made (it just shows you the facets + tags it found in Strapi) so you can sanity-check the data first. 

Run for real with:  DRY_RUN=false node tag-facets.js
***/

import "dotenv/config";
import { strapiGetAll, strapiUpdate } from "./strapi.js";

/*** Settings you might tweak ***/
/* Set to false to actually write. Anything other than the string "false" = dry run. */
const DRY_RUN = process.env.DRY_RUN !== "false";

/* Local Ollama. qwen2.5:7b gives richer, more confident tag choices than 3b and runs comfortably on 16 GB. Override with OLLAMA_MODEL / OLLAMA_URL in .env. */
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

/*** Helper: call the local model and get its raw text reply ***/
/* Uses Ollama's native /api/generate with format:"json" so the model is forced to emit valid JSON (no markdown fences to clean up). No API key — it's localhost. */
async function generate(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, stream: false, format: "json" }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Ollama responded ${res.status}. Is it running? (brew services start ollama` +
        `, ollama pull ${MODEL}). ${detail}`
    );
  }
  const data = await res.json();
  return data.response ?? "";
}

/*** Helper: safely pull a JSON object out of the model's reply ***
/*Models sometimes wrap JSON in ```json fences or add stray words. This grabs the first {...} block and parses it, so minor formatting noise won't crash us. */
function parseJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/*** Main ***/
async function main() {
  console.log(`\n🏷️  tag-facets.js   (DRY_RUN = ${DRY_RUN})\n`);

  // 1. All existing tags. In our schema, a tag's human name lives in `label`.
  const tags = await strapiGetAll("tags");
  if (tags.length === 0) {
    console.log("No tags exist yet — create some in Strapi first, then re-run.\n");
    return;
  }
  // Hardening: never let the model assign `area` tags (neighbourhoods/streets).Those are factual and curated by hand — an AI guessing them by vibe is wrong. So the model only picks from non-area tags, while the id lookup still covers EVERY tag (we preserve any existing area tags during the merge below).
  const taggable = tags.filter((t) => t.kind !== "area");
  const allowedLabels = taggable.map((t) => t.label);
  const allowedSet = new Set(allowedLabels);
  // Lookup so we can turn a chosen name back into the id Strapi needs.
  const labelToDocId = new Map(tags.map((t) => [t.label, t.documentId]));
  console.log(
    `Allowed tags (${taggable.length} of ${tags.length}, area tags excluded): ${allowedLabels.join(", ")}\n`,
  );


  // 2. All facets, WITH their existing tags populated so we can merge (not overwrite) the hand-curated tags already on each facet.
  const facets = await strapiGetAll("facets", "populate=tags");
  console.log(`Found ${facets.length} facets.\n`);

  /*** In dry-run mode we skip ALL model calls — just show what Strapi has so you can confirm the data looks right before spending any free-tier quota. ***/
  if (DRY_RUN) {
    console.log("Dry run — no model calls made. Facets that would be tagged:\n");
    for (const facet of facets) {
      console.log(`  • ${facet.title ?? "(untitled)"}  —  ${facet.subtitle ?? "(no subtitle)"}`);
    }
    console.log(`\nAllowed tags: ${allowedLabels.join(", ")}`);
    console.log("\n✅ Dry run complete. Run with DRY_RUN=false to actually call the model + write tags.\n");
    return;
  }


  // 3. ONE local-model request for the WHOLE batch (only reached when DRY_RUN=false). We number each facet and ask the model to return a JSON object mapping that number to the tags it chose. 10 facets = 1 call. Runs on your Mac, free.
  console.log(`Calling local model (${MODEL}) once to tag all facets...\n`);

  const facetList = facets
    .map((f, i) => `${i + 1}. title: ${f.title ?? ""} | subtitle: ${f.subtitle ?? ""}`)
    .join("\n");

  const prompt = [
    "You are tagging items for a city-discovery graph.",
    "Choose ONLY from this exact list of allowed tags (never invent new ones):",
    JSON.stringify(allowedLabels),
    "",
    "Here are the items, numbered:",
    facetList,
    "",
    "Return ONLY a JSON object mapping each item number (as a string key) to an",
    "array of the tag names that fit it. Use [] for items that match no tags.",
    'Example: {"1": ["vintage", "minimalist"], "2": []}',
    "No explanation, no markdown fences.",
  ].join("\n");


  const responseText = await generate(prompt);
  const byIndex = parseJsonObject(responseText);

  // 4. Apply the result to each facet. Strapi writes are local + free, and so is the model call above — there's no quota to worry about anymore.
  for (let i = 0; i < facets.length; i++) {
    const facet = facets[i];
    const picked = Array.isArray(byIndex[String(i + 1)]) ? byIndex[String(i + 1)] : [];

    // Keep only names that are real, ALLOWED tags (non-area; guards against hallucinations/typos and against the model sneaking an area tag back in).
    const chosen = picked.filter((name) => allowedSet.has(name));
    const tagDocIds = chosen.map((name) => labelToDocId.get(name));

    // Hardening: MERGE with the facet's existing tags instead of replacing them, so hand-curated tags (and area tags) survive a re-run. Union the docIds.
    const existingDocIds = (facet.tags ?? []).map((t) => t.documentId);
    const mergedDocIds = [...new Set([...existingDocIds, ...tagDocIds])];
    const addedCount = mergedDocIds.length - existingDocIds.length;

    console.log(
      `• ${facet.title || "(untitled)"} → +[${chosen.join(", ") || "none"}]` +
        ` (${addedCount} new, ${mergedDocIds.length} total)`,
    );

    // Only write when the merge actually adds something (skips no-op updates).
    if (addedCount > 0) {
      // Strapi 5: we set the relation to the UNION of docIds, so existing tags are kept. (If Strapi rejects documentIds, the fallback is numeric `id`s — but documentId is the Strapi 5 way.) Facet D&P is OFF, so this is live now.
      await strapiUpdate("facets", facet.documentId, { tags: mergedDocIds });
    }
  }

  console.log("\n✅ Done — tags written to local Strapi (1 local model call, $0).\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
