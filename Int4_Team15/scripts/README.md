# Kar.at `/scripts`

One-off Node tools that **build, enrich, image, and deploy the graph data**. None of
them run inside the live app — the canvas only ever *reads* finished data. They fall into
four jobs: maintain `seed.json`, source images, AI-enrich, and push to Strapi/Render.

> **Source of truth.** `web/src/data/seed.json` was the canonical dataset while the canvas
> was built (frontend runs `VITE_USE_API=false`, reads it directly). As of 2026-06-16 the
> data is also re-synced into Strapi and live on Render — the end-product model is
> **Render Strapi = live source, `seed.json` = git-versioned backup** you refresh from it.

## Conventions (all scripts)

- **ES modules**, run with `node <script>.js` from **inside `scripts/`** (so `dotenv` finds `scripts/.env`).
- **`DRY_RUN` defaults to `true`** on anything that writes — preview first, then `DRY_RUN=false node …`.
  (Pure read→one-file-write helpers like `dump-*` have no `DRY_RUN`; they're already safe.)
- **Strapi 5 REST**, Bearer `STRAPI_TOKEN` (from `scripts/.env`), `documentId` in URLs, relations connect by `documentId`.
- **Local-first.** Strapi-writing scripts target `STRAPI_URL` (default `http://localhost:1337`)
  to protect the Render free-plan entry cap (~500). Push to Render via `strapi transfer` afterwards.
- Shared HTTP helpers live in **`strapi.js`** (`strapiGetAll`, `strapiCreate`, `strapiUpdate`).

## Map of every script

| Script | Job | Writes to | DRY_RUN |
| --- | --- | --- | --- |
| **Dataset (`seed.json`)** | | | |
| `apply-data-edits.js` | **periodic by-hand edits** (facets, curators, membership) | `seed.json` | ✓ |
| `reassign-curators-by-moodboard.js` | set each item's curator to its moodboard's owner | `seed.json` | ✓ |
| `normalize-seed.js` | rebuild the standardized seed from a base | `seed.json` | `--dry` |
| `dump-seed.js` | snapshot Strapi → `seed.json` (Render→seed backup) | `seed.json` | — |
| **Images** | | | |
| `dump-image-worklist.js` | make a CSV worklist from the seed | `scripts/out/*.csv` | — |
| `apply-images-to-seed.js` | worklist → download/optimize → **seed.json** | `seed.json` + `public/facets` | ✓ |
| `apply-image-overrides.js` | manual per-item image curation | `seed.json` + live Strapi | ✓ |
| **AI enrichment (local Ollama)** | | | |
| `tag-facets.js` | auto-tag every facet | local Strapi | ✓ |
| `embed-and-link.js` | embeddings → sparse `similar` edges | local Strapi | ✓ |
| **Deploy** | | | |
| `import-seed-to-strapi.js` | re-sync `seed.json` → local Strapi | local Strapi | ✓ |
| **Shared / data** | | | |
| `strapi.js` | Strapi 5 REST helper (imported by others) | — | — |
| `data/data-edits.js` | data: your periodic facet/curator/membership edits (**edit this**) | — | — |
| `data/image-overrides.js` | data: your manual image-URL picks (**edit this**) | — | — |

---

## 1. Maintain the dataset (`seed.json`)

### ⭐ The full edit → live flow (the one you keep looking up)

Editing data is **4 commands across 2 folders**. Steps 3–4 are what actually push it to the
live Render site — **editing seed.json and `git push`/merging does NOT update Render.** Run each
block from the folder shown.

```bash
# ── 1. EDIT ─────────────────────────────────────────────
#    edit scripts/data/data-edits.js   (or data/image-overrides.js for images)

# ── 2. APPLY to seed.json ───────────────────────────────
cd scripts
node apply-data-edits.js                       # preview — writes nothing
DRY_RUN=false node apply-data-edits.js         # write web/src/data/seed.json
#    → refresh localhost to see it (dev reads seed.json directly)
#    → commit:  git add web/src/data/seed.json scripts/data/data-edits.js && git commit

# ── 3. PUBLISH part 1: seed.json → LOCAL Strapi ─────────
#    (local Strapi must be running:  cd ../cms && npm run develop)
cd scripts
DRY_RUN=false node import-seed-to-strapi.js    # WIPES + re-imports LOCAL Strapi

# ── 4. PUBLISH part 2: LOCAL Strapi → RENDER (the step everyone forgets) ──
cd ../cms
npx strapi transfer --to https://int4-team15.onrender.com/admin --to-token <TRANSFER_TOKEN>
#    → verify:  open https://int4-team15.onrender.com/api/facets?populate=*
```

- **`<TRANSFER_TOKEN>`** comes from the **Render** admin → **Settings → Transfer Tokens → Create**
  (Full access; shown once, reusable across runs until it expires). This is **not** the
  `scripts/.env` `STRAPI_TOKEN` — that one is for the REST scripts; the transfer token is separate.
- **Render is slow (free tier):** the transfer can cold-start or stall for ~30–60 s; if it errors
  partway, just re-run it — `transfer` is a full replace, so it's safe to repeat.
- **Image-only edits can skip steps 3–4** — `apply-image-overrides.js` can push straight to Render
  with a Render API token (see §2b).

### Periodic by-hand edits — `apply-data-edits.js` (the everyday tool)

For ongoing corrections (fix a subtitle, retag a shop, swap an item's images, tweak a
curator's copy, move an item to another moodboard), edit the declarative maps in
**`data/data-edits.js`**, then apply:

```bash
node apply-data-edits.js                 # preview — writes nothing
DRY_RUN=false node apply-data-edits.js   # write seed.json
```

It's idempotent, seed-only, and warns instead of guessing. Three maps:

- **`FACET_EDITS`** (by title, any `item | shop | moodboard | vibe`) — `subtitle`, `shopType`,
  arbitrary `data`, `images` (→ `data.imageUrls`), and tags via `addTags` / `removeTags` /
  `setTags` (by label). Unknown tag labels are **warned + skipped** unless `ALLOW_NEW_TAGS=true`.
- **`CURATOR_EDITS`** (by slug) — the API-only curator fields (`quote`, `antwerpTips`). The
  **display** fields (name, handle, subculture, tone, bio, avatar) live in
  [`web/src/lib/curators.js`](../web/src/lib/curators.js); the tool **reads that file and syncs
  those into every embedded curator copy in the seed** automatically (replaces the old one-off
  copy-sync script).
- **`MEMBERSHIP`** (by moodboard title) — `add` / `remove` items by title, maintained as
  `contains` edges. `add` enforces single membership (removes the item from any other moodboard).

After applying, **publish with steps 3–4 of the flow above** (`import-seed-to-strapi.js` → `strapi transfer`) — full details in §4.

### Curators follow moodboards (`reassign-curators-by-moodboard.js`)

An item is curated by whoever owns the moodboard it sits in. This tool sets each `item`'s
`curator` to its moodboard's curator (copied from the moodboards' existing embeds, which match
[`web/src/lib/curators.js`](../web/src/lib/curators.js)), so the "recommended by" stack on shop
pages and the item-detail credits stay aligned with each curator's niche.

```bash
node reassign-curators-by-moodboard.js                 # preview (per-item changes + new distribution)
DRY_RUN=false node reassign-curators-by-moodboard.js   # write seed.json
```

Idempotent and seed-only. Run it **after** `MEMBERSHIP` changes (moving items between moodboards
also moves who curates them). Publish with steps 3–4 of the flow above.

### Other dataset tools

- **`normalize-seed.js`** — rebuilds `seed.json` into the agreed schema
  (`facet.type = vibe | moodboard | shop | item`, no `area`/`spaceType`, slim edge stubs,
  vibe←moodboard←item topology). Re-runnable; `--dry` previews.
- **`dump-seed.js`** — snapshots a Strapi instance back to `seed.json`. Point it at **Render** to
  refresh the git-versioned backup after a `strapi transfer`. Only safe when the source DB is a
  faithful mirror (Render, or local right after `import-seed-to-strapi.js`) — running it against a
  *stale* DB would overwrite the clean seed.

## 2. Images

Images are stored as **path/URL strings** in each facet's `data.imageUrls` — **not** Strapi
media uploads (Render's free disk is ephemeral). Relative `/facets/x.jpg` paths are served by
the frontend from `web/public/facets/`; **absolute `https://…` URLs** render directly with no
local file. Two ways to get images in:

**a) Worklist pipeline** (sheet-driven; was Victoria's, also a fallback for downloading +
optimising a remote URL into a committed local file):
```bash
node dump-image-worklist.js              # seed → scripts/out/image-worklist.csv
# fill imageURL1..5 per row in Sheets, export back to CSV, then:
DRY_RUN=false node apply-images-to-seed.js   # → downloads/optimizes (sharp) → seed.json
```

**b) Manual curation** — edit the arrays in **`data/image-overrides.js`** (one entry per item,
grouped by moodboard, `⚠ DUPLICATE` flags show clashes), then:
```bash
node apply-image-overrides.js                # preview
DRY_RUN=false node apply-image-overrides.js  # → seed.json + local Strapi
# push straight to the live site instead (no transfer) with a Render API token:
STRAPI_URL=https://int4-team15.onrender.com STRAPI_TOKEN=<render-token> \
  DRY_RUN=false node apply-image-overrides.js
```
Editing `imageUrls` only changes a field on existing entries → **zero quota impact**.

## 3. AI enrichment — local Ollama (free, no key)

`tag-facets.js` and `embed-and-link.js` enrich the graph using a **local Ollama** model — no
API key, account, billing, or rate limits. (Gemini's free tier is unavailable in the EU; every
project is forced onto the paid tier with a €10 minimum, so Ollama runs the model on your Mac
instead.) Each script makes **one batched call per run** (all facets in a single request).

- **`tag-facets.js`** — picks, for every facet, only tags that already exist (`qwen2.5:7b`;
  override `OLLAMA_MODEL`, e.g. `qwen2.5:3b` for speed).
- **`embed-and-link.js`** — embeds every facet (`nomic-embed-text`), keeps each facet's **top 3**
  nearest neighbours (sparse, protects the entry cap), and writes `similar` edges. Vectors stay
  in memory only.

```bash
node tag-facets.js                      # dry run — Strapi reads only, no model call
DRY_RUN=false node tag-facets.js        # real run — local model + writes
DRY_RUN=false node embed-and-link.js
```

## 4. Deploy: `seed.json` → local Strapi → Render

This is steps 3–4 of the **edit → live flow** in §1. Two hops, because `strapi transfer` only
moves data **instance → instance** (not from a file):

- **Step 3 — `import-seed-to-strapi.js`** re-syncs **local** Strapi from `seed.json`: wipes
  edges→facets→tags→curators→shops, recreates curators/tags, all facets (shops included as
  `type:"shop"` facets), links each item to its shop facet, then the edges. (Local Strapi must be
  running: `cd ../cms && npm run develop`.)
  ```bash
  cd scripts
  node import-seed-to-strapi.js                 # preview
  DRY_RUN=false node import-seed-to-strapi.js   # WIPES + re-imports LOCAL Strapi
  ```
- **Step 4 — `strapi transfer`** pushes **local → Render** (run from `cms/`):
  ```bash
  cd ../cms
  npx strapi transfer --to https://int4-team15.onrender.com/admin --to-token <TRANSFER_TOKEN>
  ```
  - `<TRANSFER_TOKEN>`: Render admin → **Settings → Transfer Tokens → Create** (Full access; shown
    once; reusable). Separate from the `scripts/.env` `STRAPI_TOKEN`.
  - `transfer` **replaces** Render's data with local. Verify after:
    `https://int4-team15.onrender.com/api/facets?populate=*`.
  - Free tier is slow — if it stalls/errors mid-transfer, just re-run (it's a full replace).
  - ⚠️ **Render must already be running the matching schema** (deploy the cms first) or transfer
    rejects the data, and any import-dropped fields end up null on the destination.

---

## Setup (once)

```bash
# scripts deps + env
cd scripts
npm install                 # includes sharp (image optimization)
cp .env.example .env        # then set STRAPI_TOKEN

# for the AI scripts only: install + start Ollama, pull the models (one time)
brew install ollama && brew services start ollama
ollama pull qwen2.5:7b      # tagging   (qwen2.5:3b also fine)
ollama pull nomic-embed-text  # embeddings
```

- **`STRAPI_TOKEN`** — Strapi admin → Settings → API Tokens → Create (**Full access** is simplest
  for local one-offs; or Custom: Facet `find`+`create`+`update`, Tag/Curator `find`+`create`,
  Edge `create`). For pushing image overrides straight to Render, create the token on the
  **Render** admin and pass it via `STRAPI_TOKEN` with `STRAPI_URL=…onrender.com`.
- **No AI key** — Ollama is local. Optional: `OLLAMA_MODEL`, `OLLAMA_EMBED_MODEL`, `OLLAMA_URL`.
- Local Strapi running (`cd ../cms && npm run develop`) for any Strapi-writing script.

## Gotchas worth knowing

- **Facet has no `description`** — copy lives in `subtitle`; the spec table reads `data.{material,condition,brand,sizes}`.
- **Tags map by `label`**, not name; reuse existing labels so you don't add tag entries (quota).
- **Relations connect by `documentId`** in Strapi 5 (not the numeric `id`) — the importer relies on this.
- **`facet.name`** is set to the shop's title on shop facets so a populated `f.shop` exposes
  `.name` (the canvas reads `f.shop?.name`). See `.github/architecture.md` §4/§11.
- **`image-overrides.js` is keyed by item `title`** — so two items must not share a title (a JS
  object can't hold duplicate keys, and the apply matches by title). We hit this with two
  "Printed silk scarf" items; the Dries one was renamed "Signature silk scarf". Keep titles unique.
- **Image URLs must be the *direct image* URL** (`https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg`),
  not the Pexels *page* URL (`https://www.pexels.com/photo/...`, which returns HTML → broken `<img>`).
  Validate URLs resolve before applying.
- **The data is LIVE on Render** (`int4-team15.onrender.com`); local Strapi mirrors it. After editing
  local data, `strapi transfer` to push it up — the git push alone does **not** update Render's DB.
- **`scripts/out/` is gitignored**; `data/*.js` is committed (it's content, not output).
