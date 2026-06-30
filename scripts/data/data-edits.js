/*** scripts/data/data-edits.js

ONE place for periodic, by-hand data corrections. Edit the maps below, then: 

node scripts/apply-data-edits.js    # preview (writes nothing)
DRY_RUN=false node scripts/apply-data-edits.js      # apply to web/src/data/seed.json

Everything here is DECLARATIVE and idempotent: re-running with no edits is a no-op, and each entry only changes the fields you list. The apply script writes seed.json only — publish to Render afterwards with the usual `import-seed-to-strapi.js` + `strapi transfer` (see scripts/README.md §4).

Three kinds of edit:
 *   FACET_EDITS    — any facet (item | shop | moodboard | vibe), matched by title
 *   CURATOR_EDITS  — curator API-only fields (quote, antwerpTips), matched by slug (display fields like bio/tone live in web/src/lib/curators.js, which this tool reads and syncs into seed automatically)
 *   MEMBERSHIP     — which items sit in a moodboard (the `contains` edges)


*** Facet edits — keyed by EXACT facet title ***
Supported keys per entry (all optional):
   subtitle   string                — the facet's one-line copy
   shopType   string                — sets data.shopType (boutique, vintage_store…)
   data       object                — shallow-merged into the facet's data blob
   images     string[]              — sets data.imageUrls (absolute URLs render directly; "/facets/x.jpg" must already exist)
   addTags    string[] of labels    — add existing tags (by label); unknown → warned
    removeTags string[] of labels    — remove tags by label
   setTags    string[] of labels    — REPLACE all tags (overrides add/remove)
***/

export const FACET_EDITS = {
  "My Ohm": {
    subtitle: "Handmade leather boots and bags, built to last.",
    addTags: ["handmade", "local-designer", "neutral-palette"],
  },
  "Camden": {
    subtitle: "Bold punk, rock and alternative vintage in the fashion district.",
    addTags: ["vintage", "retro", "second-hand", "edgy"],
  },
};

// ── Curator edits — keyed by slug (vincent | noor | maaike | lexx | senne | fleur)
// For the fields the FRONTEND shows (name, handle, subculture, tone, bio, avatar),
// edit web/src/lib/curators.js — the apply script syncs those into seed for you.
// Use this map only for the API-only fields that aren't in curators.js:
//   quote, antwerpTips  (and, if you ever need to, an override of any synced field)
export const CURATOR_EDITS = {
  // noor: {
  //   quote: "The best pieces already have a past.",
  //   antwerpTips: "Think Twice and Episode on Kammenstraat…",
  // },
};

// ── Moodboard membership — keyed by moodboard title ─────────────────────────
// add/remove items (by title) → creates/removes the `contains` edge
// (moodboard → item). An item can sit in only one moodboard, so `add` first
// removes it from any other moodboard.
export const MEMBERSHIP = {
  // "Nightlife Fits": {
  //   add: ["Pleated trousers"],
  //   remove: ["Some item no longer here"],
  // },
};
