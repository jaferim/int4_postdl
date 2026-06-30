# Kar.at: Architecture and Setup

> Kar.at is an infinite-canvas discovery platform for Visit Antwerp. Visitors explore a
> force-directed graph of *facets* of the city (shop items, moodboards, vibes)
> curated and connected by local creatives, rather than a list of tourist landmarks.
> Shoppable items can be added to a personal collection (the "Vault") and reserved before a trip.

This document is the single source of truth for how the project is built. Keep it next to the code and update it when the architecture changes.

---

## 1. Tech stack

Each tool is picked for the one job it is actually good at, and all of them are things we already know.

| Layer | Tool | Why |
|---|---|---|
| Backend / CMS | **Strapi 5** (SQLite in dev, Postgres in prod) | Headless CMS means database, auto-generated API, and admin panel for free. Erases almost all hand-written backend. |
| Canvas app | **React 19 + Vite 8** | The graph is heavily interactive (drag, pan, zoom, hover, live filtering); React 19 and the R3F ecosystem give full control over the WebGL scene. |
| Graph layout | **d3-force** | Runs the force-directed simulation (`forceLink`, `forceManyBody`, `forceCollide`, `forceX`, `forceY`) on a tick loop. It owns *positions only*, decoupled from rendering. |
| Graph rendering | **react-three-fiber + drei + three.js** | A custom WebGL scene renders nodes and edges from the d3-force positions each tick. We render it ourselves (instead of `react-force-graph`) for full control of the look: gradient lines, per-type node meshes, orthographic pan/zoom. drei supplies `OrbitControls`, `Segments`, `Html`, `Merged`, `Environment`, `PerformanceMonitor`. |
| Mesh instancing | **drei `<Merged>`** | All node geometries and materials are built once and shared as GPU instances (see `SharedMaterialsProvider`), so hundreds of nodes stay cheap. SVG item shapes are parsed with three's `SVGLoader` and extruded. |
| Routing | **react-router-dom v7** | `createHashRouter` with an `App` layout shell (`<Outlet/>`): `/` is the canvas, `/:itemId` is item detail, `/shops/:shopName` is the shop drill-down, `/curators/:slug` is the curator drill-down. Hash routing so the static deploy needs no server rewrite rules. |
| Search | **client-side (`web/src/lib/search.js`)** | A pure, scored index over items, shops, and curators, built in the browser from the same graph data. No server, no search service. Opened from the nav search bar or Cmd/Ctrl+K (see section 7). |
| Animation | **GSAP** (`@gsap/react`) | Timeline animations for node entrance and canvas transitions (used in `ItemNode` and the intro). |
| Colour | **culori** | Parses and interpolates the CSS theme colours fed into three.js materials. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Utility styling for the HTML/overlay layer; CSS custom properties are bridged into three.js materials via a `useThemeVar` hook. |
| Perf / debug | **r3f-perf**, **leva** | `<Perf>` overlay for frame and draw-call stats (installed, currently **commented out** in `GraphScene.jsx`, uncomment to profile). drei's `<PerformanceMonitor>` *is* wired in (`App.jsx`) to scale `dpr` up or down with the framerate. `leva` (debug GUI) and `@react-three/uikit` (in-scene UI) are installed but **not wired in**. |
| QR / link handoff | **qrcode.react** | Renders the cross-device "Send to device" QR (`<QRCodeSVG>`). The handoff encodes the whole Vault into a URL **query string**, no server (see section 4). |
| AI tagging / edges | **`/scripts`: Node.js, local Ollama** | Two one-time scripts that enrich graph data before deployment. They run the model locally (no API key or billing) and are never a live dependency. See section 8. |

**Layout and rendering are deliberately separate.** `react-force-graph` bundles the d3 simulation *and* a canvas/WebGL renderer together. We split them: **d3-force** computes positions, **react-three-fiber** draws our own three.js scene from those positions on every tick (see [`web/src/Components/GraphScene.jsx`](../web/src/Components/GraphScene.jsx)). This is what lets us render gradient edges (`vertexColors`), distinct meshes per node `type`, an orthographic left-click-pan camera, and node dragging that hands control back to the simulation via `fx`/`fy`.

**Not used:** `react-force-graph` (we render the scene ourselves, see above); a custom auth system (there are no user accounts; a visitor's email *is* their identity at reservation time).

---

## 2. How it fits together

```
                 ┌──────────────────────────────────┐
                 │  Scripts (/scripts)               │   run locally, at seed time
                 │  seed.json = canonical data;      │
                 │  scripts enrich it, then push up: │
                 │  • tag-facets.js                  │
                 │    -> Ollama tags all facets      │
                 │  • embed-and-link.js              │
                 │    -> Ollama embeds facets        │
                 │    -> cosine "similar" edges      │
                 │  • image pipeline                 │
                 │    -> data.imageUrls per facet    │
                 │  • import-seed-to-strapi.js       │
                 │    -> seed.json => local Strapi   │
                 └───────────────┬──────────────────┘
                                 │ seed.json => local Strapi => (strapi transfer) => Render
                                 ▼
┌──────────────┐   fetch    ┌─────────────────┐    POST reservation    ┌───────────────┐
│  React app   │ ─────────▶ │     Strapi      │ ◀────────────────────  │ React app     │
│  (canvas)    │  facets,   │  data + admin   │                        │ (reserve form)│
│              │  edges,    │                 │ ── shop owner sees ──▶ │ Strapi admin  │
│  Vault lives │  tags      │                 │      reservations      └───────────────┘
│  in browser  │            └─────────────────┘
└──────────────┘
```

Key idea: **all AI work happens at seed time, locally.** The scripts compute tags and similarity edges once and store finished records in local Strapi. You then `strapi transfer` the enriched data up to the hosted instance. The running app only reads pre-baked data, so the live system makes zero AI calls. (The `POST reservation` arrow above is **now wired**: reserving writes a `reservation` to Strapi and un-reserving cancels it, see section 4. The `board` handoff path stays client-side and writes nothing back.)

**Data source is switchable.** The canvas loads its graph through [`web/src/lib/load.js`](../web/src/lib/load.js) (the `useGraph` hook), which has a `USE_API` flag: when `true` it fetches `facets` and `edges` from Strapi (`VITE_STRAPI_URL` or `http://localhost:1337`, `/api`, `populate=*`); when `false` it reads a committed static snapshot ([`web/src/data/seed.json`](../web/src/data/seed.json)). The Strapi response is normalised into d3-force `{ nodes, links }` by [`web/src/lib/graph.js`](../web/src/lib/graph.js). **seed.json and Strapi are reconciled** (see section 10): the deployed site reads **`USE_API=true` from the live Render Strapi**, while the committed default stays `false` so local dev and offline work run off `seed.json` (the git-versioned backup). `useGraph` also exposes a **load lifecycle** (`status`, `error`, `retry`): a `Loading` component covers the async fetch and route transitions, and a `GraphError` screen (with a "Try again" button) appears if the fetch fails. This matters because Render's free tier cold-starts for roughly 30 to 60 seconds, so the loader times out at 60 seconds and retries once rather than hanging forever (see section 10).

> **The facet model (standardized 2026-06-15, reconciled into Strapi, see sections 8 and 10).**
> `facet.type` is **`vibe | moodboard | shop | item`**:
>
> - **`shop`** is a store, market, or venue that sells items (boutiques, vintage/sneaker/concept/
>   thrift stores, consignment, ateliers, flea markets, the fashion museum). Renders **pink**
>   (the old "Cat2" look). Save-only, no price.
> - **`item`** is a specific piece with a `price`, sold at a shop. Renders blue. Save and Reserve.
>
> **`spaceType` and `itemKind` are REMOVED.** Place-vs-product is now carried by `type`
> (`shop` vs `item`), not by a `spaceType` flag. A shop's retail subtype (boutique,
> vintage_store, and so on) lives in the `data` blob as `data.shopType` (non-load-bearing). Streets and
> neighbourhoods are **not** facets; they remain `area`-kind tags (the old `Kloosterstraat`
> facet was dropped). There is **no `area` facet type**.
>
> `type: "shop"` also appears as a *synthesized* centre node inside the ShopDetail drill-down
> (id `shop-<name>`); that one renders via `ShopNode`. Real shop **facets** render via the
> pink `ItemNode` path (`CanvasNode` distinguishes them by the `shop-` id prefix).
>
> **Cross-device handoff (as shipped):** the Vault lives in the browser (local-first, per-device). When a visitor wants it on another device, the app encodes the whole Vault into a **URL query string** and offers three ways to move it: the native share sheet (mobile), a copy-link button, and a QR code. The receiving device decodes it on open and adopts the Vault, with **no server and no `board` record**. (Reservations, by contrast, now **do** write to Strapi on top of the local state, see section 4.)

---

## 3. Repository structure

```
/
├── .github/                       # repo meta (lecturer-stipulated docs live here)
│   ├── architecture.md            # this file
│   ├── coding_guidelines.md       # team coding conventions
│   └── pull_request_template.md   # auto-loaded by GitHub to prefill PR descriptions
├── cms/          # Strapi 5 (backend, API, admin): content types under src/api/*
│                  # reservation API adds a custom cancel route (routes/01-cancel.ts + controller);
│                  # src/index.ts bootstrap grants the Public role reservation create + cancel
├── web/          # React 19 + Vite (the canvas app)
│   ├── .env.example               # template: copy to .env.local (VITE_USE_API, VITE_STRAPI_URL)
│   ├── public/
│   │   ├── facets/                # committed facet images (the hover-collage sources)
│   │   ├── favicon/               # multi-size favicon set + webmanifest
│   │   └── assets/images/         # logo, curator avatars, placeholders
│   └── src/
│       ├── main.jsx               # react-router setup (createHashRouter: App shell + /, /:itemId, /shops/:shopName, /curators/:slug); wraps the tree in <ErrorBoundary> and sets the router errorElement to <RouteError>
│       ├── App.jsx                # layout shell: bg, nav, decorative chrome, <Outlet/>; mounts canvas/Loading/GraphError on /; Cmd+K search shortcut
│       ├── Components/
│       │   ├── GraphScene.jsx             # R3F scene: d3-force sim, edge segments + physics, drag/pan, LOD, home-layout cache
│       │   ├── CanvasNode.jsx             # dispatches to Vibe/Mood/Shop/Curator/Item by node `type`
│       │   ├── VibeNode.jsx               # cluster-centre node (pinned to canvas centre)
│       │   ├── MoodNode.jsx               # moodboard node (faint karat-diamond motif behind the details)
│       │   ├── ItemNode.jsx               # item (blue) / shop (pink) node: glass mesh, GSAP, image texture
│       │   ├── ShopNode.jsx               # synthesized shop centre node: details, "recommended by" curator stack, Maps link, Add to Vault
│       │   ├── CuratorNode.jsx            # synthesized curator centre node in the CuratorDetail drill-down
│       │   ├── ItemDetail.jsx             # /:itemId route page: data-driven from the facet node (simplified layout on mobile)
│       │   ├── ShopDetail.jsx             # /shops/:shopName route: shop drill-down graph; derives the shop's curators for the centre node
│       │   ├── CuratorDetail.jsx          # /curators/:slug route: curator drill-down (theme-painted)
│       │   ├── SearchOverlay.jsx          # search palette: input, live results, tag chips, keyboard nav
│       │   ├── SearchBar.jsx / SearchButton.jsx  # nav search triggers (desktop bar / mobile icon)
│       │   ├── Loading.jsx                # async fetch / route-transition loader
│       │   ├── GraphError.jsx             # recoverable graph-fetch error screen ("Try again")
│       │   ├── ErrorBoundary.jsx          # class boundary: catches unexpected render crashes in providers / outside the router -> ErrorScreen
│       │   ├── RouteError.jsx             # router errorElement: catches crashes inside route components -> ErrorScreen
│       │   ├── ErrorScreen.jsx            # shared friendly branded crash screen (reload button)
│       │   ├── VaultDrawer.jsx / VaultButton.jsx  # the Vault UI + nav trigger
│       │   ├── BackButton.jsx / ZoomControls.jsx / Breadcrumbs.jsx  # nav back, zoom rail, home coachmark
│       │   ├── CuratorBar.jsx              # curator/theme selector
│       │   ├── Intro.jsx                    # onboarding orchestrator (multi-step, dark-mode)
│       │   ├── IntroPt1.jsx / Intro2&3.jsx / IntroButton.jsx  # step 1 welcome (SplitText), steps 2-3 (pick styles, pick curator), animated CTA
│       │   ├── CreativeSelect.jsx / SelectionList.jsx  # step 3 curator picker (GSAP side-scroll) + step 2 style chips (max 3)
│       │   ├── DetailCoachmark.jsx          # first-visit hints on item detail (scroll to zoom, drag to spin rings)
│       │   ├── Background.jsx             # gradient background layer
│       │   ├── SharedMaterialsProvider.jsx # builds + <Merged> all geometries/materials as instances
│       │   ├── MaterialsContext.jsx       # context exposing parsedShapes + instances
│       │   └── jsx-assets/                # decorative DOM/SVG: NoiseOverlay, SearchPixel, KaratLogo, Diamond (theme-painted 3D karat diamond), etc.
│       ├── lib/
│       │   ├── load.js            # useGraph(): API-vs-seed loader (USE_API flag) + load lifecycle (status/error/retry, timeout+retry)
│       │   ├── graph.js           # Strapi {facets,edges} -> d3 {nodes,links}
│       │   ├── search.js          # pure scored search index over items/shops/curators
│       │   ├── images.js          # sizedImage(): on-the-fly Pexels CDN resize for thumbnails
│       │   ├── curators.js        # curator display config (slug/name/tone/bio/theme/avatar): frontend source of truth
│       │   ├── curator-state.jsx / curator-context.js  # active-curator theme state + context
│       │   ├── vault.jsx / vault-context.js     # client-side Vault state (localStorage) + provider; reserve/un-reserve also mirror to Strapi
│       │   ├── reservations.js     # createReservation()/cancelReservation(): the server write (gated by VITE_USE_API, fire-and-forget)
│       │   ├── maps.js             # mapUrlFor(): Google Maps "directions" search link by shop name (shared by ShopNode + Vault)
│       │   ├── loading-context.jsx  # shared loading-source registry behind the overlay
│       │   └── themeParser.js     # useThemeVar(): CSS custom props -> three.js
│       ├── data/
│       │   ├── seed.json          # canonical dataset (git-versioned; live Render Strapi is synced FROM it)
│       │   └── shapes.json        # SVG path defs for the item glass-shape variants
│       └── assets/fonts/          # Antwerpen / SunAntwerpen brand fonts
├── scripts/      # data-maintenance, image, AI-enrichment + deploy scripts (full map in section 8)
│   ├── strapi.js                # shared Strapi REST helper (strapiGetAll, strapiUpdate, strapiCreate)
│   ├── apply-data-edits.js      # everyday: periodic by-hand facet/curator/membership edits -> seed.json
│   ├── reassign-curators-by-moodboard.js  # set each item's curator to its moodboard's owner -> seed.json
│   ├── normalize-seed.js        # rebuilds the standardized seed.json (shop/item model)
│   ├── tag-facets.js            # AI Script 1: auto-tag facets via local Ollama
│   ├── embed-and-link.js        # AI Script 2: embed facets + create "similar" edges
│   ├── dump-image-worklist.js / apply-images-to-seed.js / apply-image-overrides.js  # images -> seed.json
│   ├── import-seed-to-strapi.js # deploy: wipe + re-import local Strapi from seed.json
│   ├── dump-seed.js             # backup: snapshot a Strapi instance -> seed.json
│   ├── data/                    # committed content the scripts read (data-edits, image-overrides)
│   ├── package.json             # { "type": "module" } + dotenv, sharp (AI runs via local Ollama)
│   ├── .env.example             # template: copy to .env and fill in secrets
│   └── README.md                # canonical per-script reference
└── README.MD     # setup / how-to-run guide
```

---

## 4. Data model

This reflects the content types as actually built in Strapi. It is **one polymorphic `facet` type** (a `type` field plus a flexible `data` blob) rather than a separate type per node kind. That is far faster to iterate, and the canvas treats every node identically.

```
facet              -- every node on the canvas
  id, documentId   (Strapi auto)
  type             enum: vibe | moodboard | shop | item   (standardized 2026-06-15)
                   -- `vibe`      = cluster-centre node a group of facets hangs off (VibeNode, pinned to centre)
                   -- `moodboard` = a curated collection; its members hang off `contains` edges (MoodNode)
                   -- `shop`      = a store/market/venue that sells items; renders PINK; Save-only, no price
                   -- `item`      = a specific piece with a price, sold at a shop; renders blue; Save + Reserve
                   -- (NO `area` type: streets/neighbourhoods stay as `area`-kind tags)
                   -- (replaces the earlier shop_item|spot|event split AND the old item+spaceType "Cat2" scheme)
  title, subtitle
  name             string (added 2026-06-16). On `shop` facets it mirrors `title`, so a populated
                   `f.shop` self-relation exposes `.name` for the canvas (graph.js reads `f.shop?.name`).
  media            multiple media (legacy; the hover collage now reads data.imageUrls, see below)
  price            decimal, optional (items only, never on shops)
  availability     enum: available | on_hold | reserved   (default: available)
                   -- `status` is reserved by Strapi, so this field is `availability`
                   -- cached convenience, derived from reservations
  embedding        json  (the vector, stored as an array; drives similarity edges)
  data             json  (type-specific blob. Holds `imageUrls` (the hover-collage image
                   paths, see section 8) and, on shops, `shopType` = retail subtype string:
                   boutique | concept_store | consignment | vintage_store | sneaker_store |
                   thrift_store | flea_market | atelier | museum)
  curator   ->     curator   (manyToOne: one curator has many facets; author for moodboards)
                   -- RULE (2026-06-23): an `item`'s curator is whoever owns the moodboard it sits in
                   -- (moodboard ownership lives in curators.js). reassign-curators-by-moodboard.js
                   -- enforces this in the seed, so the canvas "recommended by" + item credits stay
                   -- aligned with each curator's niche.
  shop      ->     facet     (manyToOne SELF-relation, optional; set on `item` facets only,
                   points at the item's `shop`-type facet. Changed 2026-06-16 from a relation to
                   the separate `shop` collection into a self-relation, so shops live ONCE (as facets)
                   and the canvas + API agree. The populated `f.shop.name` is what items render.)
  tags      <->    tag       (manyToMany; powers search and the planned filter bar)
  createdAt, updatedAt (Strapi auto)
  ** Draft & Publish OFF ** (entries hit the API immediately, no publishing step)

tag                label (string), kind (enum: era | aesthetic | theme | vibe | area)
                   -- `area` = Antwerp neighbourhood/district (e.g. nationalestraat, kammenstraat, het-zuid)
                   ** Draft & Publish ON ** (tags must be published to appear in API)
curator            name, handle, avatar (media), bio, socials (json)
                   -- Curators are NOT canvas facets: each facet embeds a `curator` copy, and the
                   -- FRONTEND display source of truth is [web/src/lib/curators.js] (slug, name, handle,
                   -- subculture, tone, bio, theme, avatar, moodboards[], centerMoodboard). The curator
                   -- drill-down (/curators/:slug, CuratorDetail) is themed from it. `apply-data-edits.js`
                   -- syncs curators.js display fields into the seed's embedded copies (CURATOR_EDITS
                   -- carries the API-only fields quote/antwerpTips that aren't in curators.js).
shop               name, logo (media), lat, lng (decimal), hours
                   -- NOTE: shops now live as `shop`-type FACETS (above), so this standalone
                   -- collection is no longer used by the canvas. Kept only for `reservation.shop`.
                   -- Its `facets` inverse relation was removed when facet.shop became a self-relation.

edge               -- the lines between nodes
  id, documentId
  source    ->     facet   (one-way "has one"; in seed.json stored as a slim { documentId } stub,
                   not an embedded facet copy; de-bloated 2026-06-15)
  target    ->     facet   (one-way "has one"; slim { documentId } stub)
  relationType     enum: similar | same_curator | same_shop | same_era | contains | styled_with
                   -- `relation` is reserved/loaded in Strapi, so this field is `relationType`
  weight           decimal 0 to 1 (cosine similarity; controls line opacity / whether it renders)
  origin           enum: ai_suggested | curator_confirmed   (default: ai_suggested)

  -- Graph topology rules (enforced in seed by scripts/normalize-seed.js):
  --   * VIBE clusters receive connections ONLY from moodboards. No item/shop/vibe->vibe edge
  --     touches a vibe. The path to a vibe is always vibe <- moodboard <- item.
  --   * Items reach vibes THROUGH moodboards (vibe->moodboard->item), never directly.
  --   * GraphScene tunes link physics by relation: moodboard->item links are strong/tight,
  --     vibe->moodboard links are loose, so items cluster around their moodboard.
  ** Draft & Publish OFF ** (script-created edges are live immediately)

reservation        -- a visitor's request to a shop; WRITTEN to the server on reserve (see section 4 "as shipped")
  id, documentId
  name, email      visitor contact, stored inline (no User account; email = identity)
  reference        string -- the pickup code (e.g. KRT-7F3A), minted in the browser. Stored here so
                   -- the shop can match what the visitor shows, AND so the cancel route can find the
                   -- record by it (the reference is the capability that authorises cancelling).
  reservationStatus enum: requested | confirmed | declined | expired | collected | cancelled (default: requested)
                   -- `status` is reserved, so this field is `reservationStatus`
                   -- the web client only ever sets `requested` (create) and `cancelled` (un-reserve);
                   -- the rest are for the team to set in the admin
  visitStart, visitEnd  (date)
  expiresAt        (datetime; hold expiry, tied to the end of the visit window)
  facet     ->     facet   (one-way "has one"; connected by the facet documentId on create)
  shop      ->     shop    (one-way "has one"; in the schema for the admin filter, but NOT set by the
                   -- web client: the facet relation already carries the shop, and the client only
                   -- knows the shop name, not its documentId)
  ** Draft & Publish OFF ** (the app creates these via API and they are live immediately)

board              -- opt-in cross-device Vault snapshot (SCAFFOLDED, currently UNUSED)
  id, documentId   (the id that would be encoded in a share URL)
  items            json  (array of facet documentIds)
  email            string, optional (lets a board be re-found by the same visitor)
  ** Draft & Publish OFF ** (same reason as reservation)
```

> The **Vault** itself is not a Strapi type; it lives in the browser. `board` was designed as a
> server-side snapshot for the handoff, but the **shipped handoff is serverless** (the Vault is
> encoded into a URL query string, see "The Vault and cross-device, as built"), so `board` is currently
> unused. `reservation`, by contrast, **is** wired: reserving POSTs one and un-reserving cancels it
> (see "Reservation is an intent signal" below).

### Decisions that matter

1. **The graph *is* the data.** `contains` is just an edge relation, so a moodboard ("12 items") is one facet with 12 `contains` edges. Clicking it re-centers the canvas on those edges, with no separate moodboard-items machinery.
2. **Edges carry an `origin` flag.** The AI proposes `similar` edges (`weight` is cosine similarity); a curator confirming one flips it to `curator_confirmed`. That column *is* the human-in-the-loop pipeline. `weight` lets the canvas render only strong lines so it does not turn into spaghetti.
3. **`facet.availability` is a cached convenience** derived from reservations: `on_hold` is an open `requested`, `reserved` is a `confirmed`. That is what would dim or badge a node on the canvas. (The reservation write is shipped, but it does **not** yet update `facet.availability`; reflecting holds back onto the canvas is the remaining piece of this seam.)
4. **No user accounts.** A visitor's email, captured at reservation, is their identity; there is no login. Strapi's built-in Users-Permissions `User` collection stays unused; it is kept only because that plugin also governs API permissions (section 5, step 3).

### Reservation is an intent signal, not an inventory lock

There is no payment, so a reservation is a *heads-up to the shop*, not a real-time inventory lock:

- It is a **request the shop confirms**, so no race-condition or locking logic (two requests both reach the shop; the shop confirms one).
- Most curated/vintage items are quantity 1, so show `available` / `on_hold` / `reserved` and dim the held ones (this doubles as scarcity and social proof).
- The hold is tied to the visitor's stated visit dates, which is fair to shop owners.

> **As shipped: local-first, with a server write on top (2026-06-22).** The Vault is still the
> source of truth in the browser (the `reserved` flag, the pickup reference, the trip dates), and it
> mints the reference. **On top of that**, reserving now POSTs a `reservation` to Strapi so the shop
> has a real record, and un-reserving cancels it. The server write is **additive and fire-and-forget**:
> if the CMS is asleep (Render cold start) or unreachable, the local reservation still succeeds and we
> just skip the server copy, so the UI never blocks or fails on the network.
>
> - **Create:** `web/src/lib/reservations.js` `createReservation()` POSTs to `/api/reservations`
>   (name, email, reference, status `requested`, trip dates, facet relation) when the visitor confirms.
> - **Cancel:** un-reserving (or changing trip dates so they no longer cover the reserved days) fires
>   `cancelReservation()` to the **custom** `POST /api/reservations/cancel` route, which flips every
>   reservation matching the pickup reference to `cancelled`. It is idempotent (cancelling something
>   gone is a no-op success), which is what lets the client fire-and-forget.
> - **Permissions:** the **Public** role gets exactly `create` + the custom `cancel`, granted
>   idempotently in `cms/src/index.ts` `bootstrap` so it survives every deploy and data transfer. No
>   `find`/`findOne`/`update`/`delete`: reservations hold contact details and stay non-listable to the
>   public (`GET /api/reservations` returns 403). Cancelling is gated by the pickup reference, which only
>   the reserver holds, so a public cancel route cannot touch a stranger's reservation.
> - **Quota:** each reservation is one tiny REST write (one row), not an AI call, so it costs nothing in
>   tokens; the only ceiling is the Render free tier. The create endpoint is public and unauthenticated
>   by design (no visitor accounts) and has no rate limit, so it is a spam vector if the site lived long
>   term; fine for the demo. The `board` content type stays scaffolded but unused.

### The Vault and cross-device, as built (client-side)

- The Vault is **client-side and local-first**: it lives entirely in the browser (`localStorage`), instant and account-free. State and logic: [`web/src/lib/vault.jsx`](../web/src/lib/vault.jsx) (provider) and [`web/src/lib/vault-context.js`](../web/src/lib/vault-context.js); UI: [`web/src/Components/VaultDrawer.jsx`](../web/src/Components/VaultDrawer.jsx).
- **localStorage keys:** `karat-vault` (saved items; each carries a `reserved` flag, a minted `reference` code like `KRT-7F3A`, and `reservedAt`), `karat-vault-dates` (`{start,end}` trip dates), `karat-vault-contact` (`{name,email}`, captured once on first reserve and reused).
- **Reserve is gated on trip dates** and collects name and email in an adaptive modal ("a request, not a payment"). The "Reservation details" modal shows price, a shop link to Google Maps directions, the pickup reference, and a confirm-gated **Cancel** (the only cancel path, no remove on reserved cards). Editing dates confirms before cancelling: *widening* the trip keeps reservations (a `rangeCovers` check), narrowing or clearing reverts them to Saved.
- **Both items and shops are savable.** Items save from `ItemDetail`, shops from the `ShopNode` "Add to Vault" button (keyed by the shop facet's `documentId`). A saved shop row shows its retail subtype and opens back to `/shops/:name`; shops are **not** reservable (no row action), so the reserve flow stays product-only.
- **Cross-device handoff ("Send to device")** is **serverless**: the whole Vault (items, dates, contact) is base64url-encoded into a **URL query string** (`?vault=...#/`); the receiving device decodes it on load, adopts it, and opens the drawer. Three ways across: the **native share sheet** (`navigator.share`, the natural phone-to-laptop route, shown only where the Web Share API exists), a **copy-link** button, and a **QR code** (laptop-to-phone), rendered with `qrcode.react`. The payload rides in the query string rather than the hash because this is a HashRouter app and the hash is the route; an earlier hash-based handoff hung the router on open until a refresh.
- **Mobile is a companion view, not a shrunk-down canvas.** The infinite graph is the desktop hero; the phone gets a leaner experience. On mobile, `ItemDetail` swaps the in-canvas related-facet rings for a tappable related list (the WebGL drag fought DOM overlays on touch), and the canvas uses tighter physics for the narrow viewport. The handoff is how a desktop session moves to that phone.

---

## 5. Setup, step by step

This is the build order the project followed; it is useful for understanding why things are shaped the way they are. Build the data path end-to-end *before* adding canvas complexity.

1. **Repo hygiene.** Set up GitHub Flow: `main` stays deployable; every task is a `feature/...` branch merged via Pull Request. Create the folders in section 3. Add a README stub.
2. **Stand up Strapi.** `npx create-strapi-app@latest cms`, choose SQLite (no DB setup). **Then delete the nested git repo it creates:** `rm -rf cms/.git` (you want one repo for the whole project, not a repo nested inside `/cms`). Run `npm run develop` (dev mode, the Content-Type Builder only exists here) and create the admin login at `http://localhost:1337/admin`.
3. **Define content types** in the Content-Type Builder: **Facet, Tag, Curator, Shop, Edge, Reservation, Board** (see section 4). Watch the reserved words (`status` to `availability` / `reservationStatus`; `relation` to `relationType`). Turn **Draft & Publish OFF** on Facet, Edge, Reservation, and Board. Then open **Settings, Users & Permissions, Roles, Public** and enable: `find` and `findOne` on Facet, Edge, Tag, Curator, Shop; `create` on Board; `findOne` on Board. (Reservation's public `create` + custom `cancel` are **not** set by hand: they are granted automatically on every boot by `cms/src/index.ts` `bootstrap`, so they survive deploys and transfers. Leave Reservation otherwise unchecked, so it stays non-listable.)
4. **Seed a handful of real facets by hand** in the Content Manager: a few shop items, one moodboard, some edges. Facet has Draft & Publish OFF, so rows hit the API immediately.
5. **Scaffold the React app.** `npm create vite@latest web -- --template react`. Write one fetch to Strapi and dump facets as a plain list. Boring on purpose; it proves the pipe works.
6. **Add the canvas.** Install the R3F stack (`three`, `@react-three/fiber`, `@react-three/drei`) plus `d3-force`. Run a d3-force simulation over facets-as-nodes and edges-as-links, and render the positions each tick in a react-three-fiber `<Canvas>`: nodes as meshes (dispatched by `type`), edges as drei segments. (Built, see [`web/src/Components/GraphScene.jsx`](../web/src/Components/GraphScene.jsx).)
7. **Layer interactions, easiest first:** the Vault, the link handoff, search, and the planned tag filter. (Largely done: node dragging, left-click pan/zoom, per-type rendering, mesh instancing, zoom-based level-of-detail, GSAP item animations, side-scrolling tag marquee and image transitions on ItemNode, react-router with `/:itemId` (ItemDetail, data-driven from the facet node), `/shops/:shopName` (ShopDetail) and `/curators/:slug` (CuratorDetail) drill-downs, loading and recoverable-error states (`Loading` / `GraphError` with retry), decorative DOM chrome, the **Vault + serverless handoff**, **client-side search**, a **mobile pass**, and the **live reservation write** (reserve POSTs to Strapi, un-reserve cancels). The bottom tag filter was dropped.)
8. **Reservation flow.** "Reserve" opens an adaptive form (visit dates, then name and email on first reserve) and mints a pickup reference. **Shipped with the server write** (2026-06-22): the local reserve is the source of truth, and on top of it the app POSTs a Reservation so it lands in the shop owner's admin, then cancels it on un-reserve via the custom cancel route. Fire-and-forget, so a sleeping CMS never blocks the local action. See the section 4 "As shipped" note.
9. **Run the AI scripts** in `/scripts` to enrich the content before deploy. See section 8 for details.
10. **Deploy.** Strapi to **Render** Web Service + Render PostgreSQL; web to a static build on **Netlify**. Use `strapi transfer` to push enriched local data to the hosted instance. (Done: CMS live at `https://int4-team15.onrender.com`, frontend live on Netlify. Full as-deployed config, env vars, and gotchas in **section 9**; the frontend's live-API-vs-`seed.json` toggle in **section 10**.)

---

## 6. Ownership (team of 3)

- **Nabilah** (UX, scrum, backend) owns steps 1 to 4: repo, Strapi config and permissions, content modelling, seeding. Structure and data shape, not heavy coding. Also owns the AI scripts (section 8).
- **Idris** (design, front-end) owns steps 6 to 7: the canvas, interactions, and the handoff, where the real React muscle is needed.
- **Victoria** (social) runs the campaign that funnels into the site; coordinates on which facets and curators get featured.
- Design iteration is shared.

---

## 7. Conventions

- **Git:** GitHub Flow. Feature branches, PRs into `main`. Short AI-usage reflections go in every PR description (a project requirement), so the prompt for them is baked into `.github/pull_request_template.md` and never forgotten.
- **Coding conventions:** see `.github/coding_guidelines.md`.
- **No em dashes in any copy** (UI, comments, commits, PRs, docs). They read as AI-generated. Use commas, periods, parentheses, or "to" instead.
- **No auth, no user accounts.** A visitor's email (captured at reservation) is their identity. The built-in Strapi `User` collection is left unused, but the Users and Permissions plugin governs the public API permissions.
- **Vault is client-side and local-first;** the cross-device handoff is **serverless** (the Vault is encoded into a URL query string; the `board` Strapi type stays scaffolded-but-unused, see section 4). **Reservations are the one exception**: the local reserve is still the source of truth, but it additionally writes a `reservation` to Strapi (and cancels it on un-reserve), fire-and-forget so the network can never block the UI. Mobile is a companion view, not a shrunk-down canvas.
- **Search is client-side** ([`web/src/lib/search.js`](../web/src/lib/search.js)): a pure module that builds a scored index over items, shops, and curators (the types with detail pages; moodboards and vibes are left out so results never dead-end). Matching is accent-folded and field-weighted (title, then tags, then shop/brand, then the rest), tags are a first-class match field, and the index is rebuilt only when the graph data changes. The UI ([`SearchOverlay.jsx`](../web/src/Components/SearchOverlay.jsx)) opens from the nav (`SearchBar` on desktop, `SearchButton` on mobile) or Cmd/Ctrl+K, and is available on every route.
- **Top nav layout:** the Kar.at logo always anchors the top-left; the search bar is centered; the Vault button sits top-right and is deliberately the largest, most emphasised control. The Back control (detail routes only) sits below the nav, indented from the logo, as a square icon styled like the zoom buttons. The home coachmark/help icon sits bottom-left, level with the lower zoom button, matching that control styling.
- **Live system makes no AI calls;** all AI is seed-time only (see section 8).
- **Rendering is split:** d3-force owns layout (node positions only); react-three-fiber and three.js draw the scene from those positions each tick. No `react-force-graph`.
- **The d3 simulation never drives React per tick.** Node positions live on the d3 node objects and are read imperatively each frame (node `useFrame` handlers and a `LinkSegments` component that mutates drei segment vectors). The graph *structure* is published to React state once, when the layout settles, not on every tick. Putting per-tick `setState` back in is the classic way to reintroduce the old drag stalls.
- **Home layout persists across navigation.** The home `<Canvas>` unmounts when a detail page opens and remounts on return. `GraphScene` keeps a module-level cache of the settled node positions (keyed by the centred board), restores them on return, and skips the settle, so the canvas comes back exactly as the visitor left it instead of re-running the spread. Scoped to home; detail views always lay out fresh; cleared on a full reload.
- **Central nodes repel harder.** The large central circles (moodboards on home, plus the shop or curator a detail page is built around) get stronger charge and a wide collision radius, so they do not overlap one another or let neighbouring board titles float behind the centre circle.
- **Hover cards and text are HTML overlays** (drei `<Html>`) positioned over node meshes, not three.js geometry.
- **Theme colours flow CSS to three.js** via the `useThemeVar` hook ([`web/src/lib/themeParser.js`](../web/src/lib/themeParser.js)), so the WebGL scene stays in sync with the Tailwind/CSS palette.
- **Geometries and materials are built once and shared as instances** (`SharedMaterialsProvider` + drei `<Merged>`, consumed via `MaterialsContext`). Do not create per-node materials or geometries in node components; pull from the shared instances so draw calls stay flat.
- **Image thumbnails are resized at the CDN.** [`web/src/lib/images.js`](../web/src/lib/images.js) (`sizedImage`) appends Pexels resize params so node textures and search thumbnails load small versions, not full-resolution images (the original cause of the canvas drag jank). Full-screen detail images stay full resolution on purpose.
- **Node components are split by type:** `CanvasNode` is just a dispatcher to `VibeNode` / `MoodNode` / `ItemNode` (items and shops) / `ShopNode` (drill-down centre). Add a new node kind by adding a branch there, not by special-casing inside `GraphScene.jsx`.
- **Level-of-detail by zoom:** below a zoom threshold the canvas sets `hideDetails`/blur to thin out edges and labels. Keep expensive per-node detail behind that flag.
- **Routing:** react-router (`createHashRouter` in `main.jsx`). `App.jsx` is the layout shell (background, nav, decorative chrome, `<Outlet/>`); the canvas and the `/:itemId`, `/shops/:shopName`, `/curators/:slug` detail pages are sibling routes. Each route guards the graph load itself: on a fetch error it renders `GraphError` (with its **own** `useGraph` instance's `retry`), since `useGraph` is called per-page, not shared. Decorative DOM chrome (gradient bg, `NoiseOverlay`, `CornerGrid`) lives in the App shell, *outside* the `<Canvas>`.

  > **Note on the persistent-canvas refactor.** Because the canvas and detail pages are *sibling* routes under one `<Outlet/>`, navigating to `/:itemId` **unmounts the whole `<Canvas>`** and tears down the d3 sim and `<Merged>`/`SVGLoader` geometries, which re-init on back-navigation. The home-layout cache (above) now papers over the most painful symptom (lost untangling) by restoring node positions on return, but the geometries and camera still re-init. A fuller fix would **hoist `<Canvas>` into the App shell so it is always mounted** and make the detail pages URL-driven overlays on top, pausing the frameloop while an overlay covers the scene. Worth doing before much more is layered on the current route shape.

- **Failures degrade gracefully, in four layers.** Nothing should leave the visitor on a blank white screen. (1) **`GraphError`** covers the *expected* failure, an API fetch that times out or returns empty, with a "Try again" button wired to `useGraph`'s `retry` (see section 10). (2) **`RouteError`** is the router `errorElement` ([`main.jsx`](../web/src/main.jsx)): the data router intercepts crashes *inside* route components before any class boundary sees them, so route trees need their own fallback. (3) **`ErrorBoundary`** is a class boundary wrapping the whole app for the *unexpected* runtime crash in providers or anything outside the route tree. (2) and (3) both render the shared branded **`ErrorScreen`** (full reload to recover, since a thrown render error leaves the tree unrecoverable). (4) A **`<noscript>` fallback** in [`web/index.html`](../web/index.html) shows a styled message to visitors with JavaScript disabled, instead of an empty canvas.
- **Reserved field names:** `status` and `relation` are taken by Strapi. Use `availability` / `reservationStatus` / `relationType`.
- **Strapi API tokens vs the Public role:** API tokens (sent as `Authorization: Bearer ...`) are for scripts and tooling. The Public role (unauthenticated) is what the canvas/frontend uses. They are completely separate permission systems.

---

## 8. Scripts (`/scripts`)

All scripts in `/scripts` are one-time or occasional Node.js tools that run **locally** before the data is transferred to the hosted Strapi. They are never run as part of the live app.

> **[`scripts/README.md`](../scripts/README.md) is the canonical per-script reference:** a table
> of every script (what it writes, whether it is `DRY_RUN`-gated) grouped by job: maintain `seed.json`
> (`apply-data-edits`, `normalize-seed`), images (`dump-image-worklist` to `apply-images-to-seed`,
> `apply-image-overrides`), AI enrichment (`tag-facets`, `embed-and-link`), and
> deploy (`import-seed-to-strapi` to `strapi transfer`). The notes below cover the enrichment design;
> see the README for the full set.

### Maintaining the data (seed.json-first)

`web/src/data/seed.json` is the canonical dataset; the live Render Strapi is synced *from* it
(section 10). The graph was originally seeded into Strapi, but that one-off bootstrap is done; the
seed is now hand-maintained and re-deployed. The seed-time tools:

- **`apply-data-edits.js`** is the everyday tool for periodic by-hand corrections. Edit the
  declarative maps in `data/data-edits.js` and apply (`DRY_RUN`-gated, idempotent, seed-only):
  - `FACET_EDITS` (by title, any `item|shop|moodboard|vibe`): `subtitle`, `shopType`, `data`,
    `images`, and tags (`addTags`/`removeTags`/`setTags` by label; unknown labels are warned and skipped
    unless `ALLOW_NEW_TAGS=true`).
  - `CURATOR_EDITS` (by slug): the API-only curator fields (`quote`, `antwerpTips`). Display
    fields stay in [`web/src/lib/curators.js`](../web/src/lib/curators.js), which the tool reads and
    syncs into the seed's embedded curator copies (this replaced a one-off copy-sync script).
  - `MEMBERSHIP` (by moodboard title): `add` or `remove` items as `contains` edges; `add` enforces
    single membership.
- **`reassign-curators-by-moodboard.js`** sets each `item`'s curator to the curator who owns the
  moodboard it sits in (sourced from the moodboards' existing curator embeds, which match
  curators.js). `DRY_RUN`-gated and idempotent; seed-only. Run it after `MEMBERSHIP` changes so the
  curator credits follow the items. The 2026-06-23 run reassigned 36 of 48 items (0 orphaned) and
  fixed Fleur having no items.
- **`normalize-seed.js`** rebuilds the standardized `seed.json` in the canonical
  `vibe|moodboard|shop|item` model: applies the types, consolidates duplicate shops, enforces
  the vibe-only-from-moodboard edge rule, and slims edge endpoints to `{ documentId }` stubs.
  Re-runnable; writes the working-tree file (`git add` afterwards).
- **Images** are stored as path/URL strings in each facet's `data.imageUrls` (not Strapi media;
  Render's free disk is ephemeral). Get them in via the sheet worklist
  (`dump-image-worklist.js` to `apply-images-to-seed.js`, which downloads and optimises with sharp
  into `web/public/facets/`), or manual per-item picks (`apply-image-overrides.js`, which assigns
  URL/path strings to `data.imageUrls`).
- **AI enrichment** is `tag-facets.js` plus `embed-and-link.js` (local Ollama; see below).

**Deploy: seed.json to local Strapi to Render.**

- **`import-seed-to-strapi.js`** wipes and re-imports local Strapi to mirror `seed.json`
  exactly (curators, tags, all facets, item-to-shop links, edges). `DRY_RUN`-gated.
- Then push local to Render with `strapi transfer` (from `cms/`, see section 9). The destination
  schema must already match (deploy the cms first) or new fields are **silently dropped**.
- **`dump-seed.js`** is the reverse: it snapshots a Strapi instance back to `seed.json`. Point it
  at Render to refresh the git-versioned backup after a transfer. (Do not run it against a
  *stale* local Strapi or it would clobber the seed; re-import first.)

```bash
# typical data change to live (run from scripts/ unless noted):
cd scripts
# 1. edit scripts/data/data-edits.js, then:
node apply-data-edits.js                       # preview (writes nothing)
DRY_RUN=false node apply-data-edits.js         # write seed.json
# 2. publish to Render, BOTH steps, in order (git/main does NOT update Render):
DRY_RUN=false node import-seed-to-strapi.js    # seed.json => LOCAL Strapi
cd ../cms
npx strapi transfer --to https://int4-team15.onrender.com/admin --to-token <TOKEN>
```

> The two-step publish (`import-seed-to-strapi` **then** `strapi transfer`) is the part most
> easily forgotten: importing only updates *local* Strapi; the `transfer` is what pushes it to
> the live site. The full step-by-step lives in [`scripts/README.md`](../scripts/README.md) section 1.

### AI enrichment scripts

**Why local-only.** Running the scripts against local Strapi means the AI calls (tagging, embedding) never count against the **cloud** Strapi free-plan entry limits. Once the data is enriched you `strapi transfer` the finished dataset up to the hosted instance.

**Provider: local Ollama (no API key, no billing).** Both scripts call a **local [Ollama](https://ollama.com) server** over plain HTTP (`fetch`): no SDK, no API key, no account, no rate limits.

| Purpose | Model | Ollama endpoint |
| --- | --- | --- |
| Tagging | `qwen2.5:7b` (override `OLLAMA_MODEL`) | `POST /api/generate` with `format: "json"` |
| Embeddings | `nomic-embed-text` (override `OLLAMA_EMBED_MODEL`) | `POST /api/embed` (batch `input` array) |

The server URL defaults to `http://localhost:11434` (override `OLLAMA_URL`).

**Why not Gemini:** Google's Gemini **free tier is unavailable in the EU**. Every project is forced onto the paid "standard" tier (responses carry `x-gemini-service-tier: standard` and `free_tier ... limit: 0` on every metric) with a 10 euro minimum to enable paid tier 1. A fresh API key does not change this; it is account and region level. So the bulk scripts run the model locally instead, which is genuinely free.

**Batch design: 1 call per run.** Each script batches **all facets into a single model call**, not one per facet. A full run of both scripts is **2 local calls total** regardless of facet count (and there is no quota to spend either way).

- `tag-facets.js` sends a numbered list of all facets in one prompt; the model returns a JSON object mapping each number to its chosen tags (`format: "json"` forces valid JSON).
- `embed-and-link.js` passes an array of all facet texts to `/api/embed`; Ollama returns one vector per text in the same order.

If the dataset grows to hundreds of facets, add chunking (split into groups of roughly 50 per request) to keep prompts and responses a manageable size.

**DRY_RUN mode.** `DRY_RUN` defaults to `true`. In dry-run mode **no model calls are made at all**; the scripts only read from Strapi and print what they found. Only `DRY_RUN=false` runs the model and writes back to Strapi.

```bash
node tag-facets.js            # safe preview: no AI calls, no writes
DRY_RUN=false node tag-facets.js   # real run: runs the model, writes tags
```

### Script 1: `tag-facets.js`

1. Fetches all Tags from Strapi, builds `allowedLabels[]` and a `label` to `documentId` map.
2. Fetches all Facets.
3. Sends **one batched prompt** to the local model (`qwen2.5:7b`): a numbered list of all facets (title + subtitle) with the full allowed-tag list. `format: "json"` forces the reply to a JSON object `{"1": ["tagA", "tagB"], "2": [], ...}`.
4. Strips any hallucinated tag names (keeps only labels that exist in the map).
5. Calls `strapiUpdate` for each facet that received tags, writing the `tags` relation as an array of documentIds.

Key constraint: the model **cannot invent new tags**; it can only choose from the labels that already exist in Strapi. This keeps the tag taxonomy clean.

### Script 2: `embed-and-link.js`

1. Fetches all Facets.
2. Sends **one batched embedding request** to the local model (`nomic-embed-text`) via `/api/embed`: all facet texts at once, one vector returned per text.
3. Computes **cosine similarity** in-memory for every pair of facets.
4. For each facet, keeps its **top 3 nearest neighbours** (configurable via `TOP_N`). Pairs are deduplicated by sorting the two documentIds, so A-to-B and B-to-A are stored once.
5. Calls `strapiCreate` for each kept pair, writing an Edge with `relationType: "similar"`, the cosine score as `weight`, and `origin: "ai_suggested"`.

Vectors are never stored anywhere; they exist only in memory during the run. The `weight` field on the edge is what the canvas uses to decide whether a `similar` edge renders at all (only strong links, so no spaghetti).

### Setup

```bash
# Install + start Ollama and pull the models (one time):
brew install ollama && brew services start ollama
ollama pull qwen2.5:7b && ollama pull nomic-embed-text

cd scripts
npm install
cp .env.example .env
# fill in STRAPI_TOKEN (no AI key needed, Ollama is local)
```

- **No AI key;** Ollama runs locally. Optional overrides in `.env`: `OLLAMA_MODEL`, `OLLAMA_EMBED_MODEL`, `OLLAMA_URL`.
- **STRAPI_TOKEN:** Strapi admin, Settings, API Tokens, Create. Pick **Full access**, or Custom with: Facet `find` + `update`, Tag `find`, Edge `create`. This is the **token's own permissions**, not the Public role.
- Local Strapi must be running: `cd ../cms && npm run develop`. Ollama must be up: `brew services list`.

### Running

```bash
# Dry run (no model calls, just shows Strapi data):
node tag-facets.js
node embed-and-link.js

# Real run (runs the local model, writes to local Strapi):
DRY_RUN=false node tag-facets.js
DRY_RUN=false node embed-and-link.js
```

Run tagging before embedding: tags are relations search and filtering use; embeddings drive the similarity edges. After both scripts succeed, `strapi transfer` to push the enriched data to the hosted instance.

### Known gotchas

- **Batched response parse failure:** `format: "json"` makes this rare, but if a response is still malformed, `parseJsonObject` strips it to the first `{...}`; affected facets get no tags (skipped, not errored). Check the console; any facet showing `[no tags]` may need a rerun, or try a larger model (`OLLAMA_MODEL=qwen2.5:14b`).
- **Ollama must be running:** if you see a connection error, start it with `brew services start ollama` and confirm the models are pulled (`ollama list`).
- **Edge `origin` column:** edges created by the script have `origin: "ai_suggested"`. A curator reviewing them in the Strapi admin can flip to `curator_confirmed`. That flag is the human-in-the-loop signal the canvas can eventually use for rendering priority.

---

## 9. Deployment

The CMS runs on **Render's free tier**; the frontend is a **static site on Netlify**. The frontend reads the hosted CMS over its public API.

> **Status (2026-06-23):** both halves are **deployed and live**. The CMS serves the standardized,
> image-curated dataset (13 shops, 48 items, plus moodboards and vibes) at `int4-team15.onrender.com`,
> and the frontend is live on Netlify with `VITE_USE_API=true`. Shipped since the first deploy: the
> mobile pass, the multi-size favicon, the serverless Vault handoff (and its query-string fix),
> client-side search, the moodboard diamond motif, the multi-step onboarding intro, the **reservation
> server write** (reserve POSTs, un-reserve cancels; verified end-to-end on Render 2026-06-22), the
> shop-detail enrichment (curator "recommended by" stack, Maps link, Add-to-Vault), the curator-by-moodboard
> data fix, and the **graceful-failure layer** (`GraphError` / `RouteError` / `ErrorBoundary` to a shared
> `ErrorScreen`, plus a `<noscript>` fallback; see section 7).
> **Quota:** reads cost nothing and reservations are plain REST writes (no AI tokens); each reservation is
> one row, so normal demo use is negligible against the roughly 500-entry cap. The reservation `create`
> endpoint is public and unauthenticated (no visitor accounts) with no rate limit, so it is a spam vector
> long term, not a concern for the demo. Instance-hours and bandwidth are a non-issue before the
> 2026-06-24 deadline.

### Strapi CMS: Render **Web Service**

- **Live URL:** `https://int4-team15.onrender.com` (admin at `/admin`).
- **Root directory:** `cms`. **Build:** `npm install && npm run build`. **Start:** `npm start`.
- **Database:** Render **PostgreSQL** (free). [`config/database.ts`](../cms/config/database.ts) already supports Postgres when `DATABASE_CLIENT=postgres`.
- **`pg` driver must be in [`cms/package.json`](../cms/package.json)** (it is): Strapi needs it at runtime for Postgres, or the boot crashes with `Cannot find module 'pg'`.

Required environment variables on the service:

| Key | Value / notes |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_CLIENT` | `postgres` |
| `DATABASE_URL` | Render **Internal** Database URL |
| `DATABASE_SSL` | `true` |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `false`: Render's Postgres presents a **self-signed cert**; without this the boot throws `self-signed certificate` and exits. |
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET` | copy from local `cms/.env` |
| `TRANSFER_TOKEN_SALT` | **required** or the admin's Transfer Tokens page errors with *"The server configuration for data transfer is invalid"* |
| `ENCRYPTION_KEY` | copy from local `cms/.env` |

**Free-tier caveats:** the service **spins down after 15 min idle** (roughly 30 to 60 second cold start on the next hit); free Postgres **expires after 90 days**. **Do not add an uptime pinger;** keeping it awake 24/7 burns the 750 instance-hour/month budget.

### Getting data onto the hosted CMS: seed.json to local Strapi to `strapi transfer`

`seed.json` is the canonical dataset, but `strapi transfer` only moves data **instance to
instance**, so the flow is two hops:

1. **Sync local Strapi from the seed:** `cd scripts && DRY_RUN=false node import-seed-to-strapi.js`
   (wipes and re-imports local Strapi to mirror `seed.json` exactly, see `scripts/README.md` section 4).
2. **Deploy the cms schema to Render first** (merge to the deploy branch, Render rebuilds). The
   destination schema must match the source **before** you transfer, or fields and relations that
   do not yet exist on Render get **silently dropped** (we hit this: `facet.name` plus the shop
   self-relation came across null because the transfer ran against the old schema).
3. **Push the data up:** hosted admin, Settings, Transfer Tokens, Create (Full access);
   from local `cms/`: `npx strapi transfer --to https://int4-team15.onrender.com/admin --to-token <TOKEN>`.

`transfer` **replaces** the destination data with the source (local). After it, verify
`/api/facets?populate=*` returns `item.shop.name` (not `null`).

> **Pagination config matters for the API render path.** The canvas fetches the whole graph in
> one un-paginated `?populate=*` call, so [`cms/config/api.ts`](../cms/config/api.ts) sets
> `rest.defaultLimit`/`maxLimit` high (1000/5000); the Strapi default of 25/100 would return
> only 25 facets/edges and the canvas would draw edges to nodes that never loaded.

**`transfer` vs `import`:** the project uses **`transfer`** (instance to instance over HTTP, token-auth), which supersedes the file-based `strapi export`/`import`. To pull the hosted data **into** a local Strapi instead, run `strapi transfer --from https://int4-team15.onrender.com/admin` (token generated on the hosted instance). `import` still works but only against an `export` tarball; it is **not** the maintained onboarding path.

### Frontend: Netlify **Static Site**

- Deployed as a **static site** (not a server), so it does not draw from the Render instance-hours.
- **Base directory:** `web`. **Build:** `npm run build`. **Publish directory:** `web/dist`. Auto-deploys from `main`.
- **Env vars (set in the Netlify dashboard):** `VITE_USE_API=true`, `VITE_STRAPI_URL=https://int4-team15.onrender.com` (see section 10). Without these the build falls back to the static `seed.json` snapshot.
- **No redirect rules needed:** the app uses hash routing, so deep links resolve client-side and the static host serves `index.html` for `/` only.

---

## 10. Frontend data layer: live API vs seed.json

[`web/src/lib/load.js`](../web/src/lib/load.js) picks its data source from env vars at build/run time:

- `USE_API = import.meta.env.VITE_USE_API === "true"`: **true only** when `VITE_USE_API` is exactly the string `"true"`; anything else (unset, empty, `"false"`) falls back to the static [`web/src/data/seed.json`](../web/src/data/seed.json) snapshot. This default means **local dev never breaks** just because Strapi is not running.
- API base is `import.meta.env.VITE_STRAPI_URL || "http://localhost:1337"` + `/api`.
- It **logs the active mode on load** so you never have to guess: `load: LIVE API -> <url>` or `load: seed.json (static)`.

**Load lifecycle (`useGraph`).** The hook returns `{ nodes, links, status, error, retry }` (`status` is `loading`, `ready`, or `error`). In seed mode it resolves synchronously (no flash). In API mode each request has a **60 second timeout with one retry**, sized for Render's free-tier cold start (roughly 30 to 60 seconds), and an **empty payload is treated as an error** (a paused DB or wrong `populate` would otherwise render a blank canvas). On error the UI shows `GraphError` with a "Try again" button wired to `retry`. **`useGraph` is called per-page** (home, ShopDetail, CuratorDetail, ItemDetail): each is its own instance with its own fetch, status, and retry, so every route guards and recovers independently (there is no shared graph provider yet; hoisting one would also dedupe the double-fetch on detail routes).

**Teammate onboarding (local):**

```bash
cd web
cp .env.example .env.local   # sets VITE_USE_API=true + the hosted VITE_STRAPI_URL
npm install
npm run dev                  # restart if already running; Vite reads env files only at startup
```

`.env.local` is gitignored (`*.local`); [`web/.env.example`](../web/.env.example) is committed as the template. For frontend work a teammate needs **only this file**; they do **not** run `strapi transfer`/`import` to get the data locally; they read it live from the hosted API.

[`web/src/lib/graph.js`](../web/src/lib/graph.js) maps Strapi `{ facets, edges }` to d3-force `{ nodes, links }`: each node carries `title`, `subtitle`, `price`, `availability`, `curator`, `shop` (name), `tags[]` (from `facet.tags[].label`), `images[]` (from `facet.data.imageUrls`), `shopType` (from `facet.data.shopType`), and each link carries `relationType` and `weight`. **`ItemDetail` renders entirely from these node fields** (images, curator, subtitle, price/availability, tags, and the shop card, which resolves the shop facet by name for its photo and blurb); there are no hardcoded item specs. The same node fields feed the client-side search index (section 7).

> **`toGraph` unwrap gotcha.** It unwraps the Strapi envelope (`[{ data: [...], meta }]`)
> vs a flat facet array. The check must only treat `.data` as the wrapper when it is an
> **array** (`Array.isArray(facets[0]?.data)`), because each facet now has its **own** `data`
> object (`{ imageUrls, shopType }`). The earlier `facets[0]?.data || ...` heuristic grabbed a
> facet's `data` blob by mistake and crashed `toGraph` with *"actualFacets.map is not a
> function"*, a blank canvas (background only). If you see that symptom after a data-shape
> change, check the console for that error first; it is not a texture/WebGL problem.

> **`useGraph` must return a stable object identity.** `GraphScene` rebuilds its whole d3
> simulation in a `useEffect` keyed on the graph object, so if `useGraph` returns a *fresh*
> `{ ...state, retry }` every render, **any** `App` re-render (for example zoom crossing the
> `hideDetails` threshold flips state, App re-renders) hands GraphScene a "new" graph, the sim
> re-ticks from scratch, and **dragged node positions snap back**. The return is therefore
> wrapped in `useMemo` so its identity only changes on a real load transition. General rule:
> memoize a hook's returned object/array when consumers feed it into effect dependency arrays.

> **seed.json and Strapi are reconciled (2026-06-16).** The 2026-06-15 standardization was done in
> `seed.json` directly, so Strapi had diverged. It is now re-synced via
> [`scripts/import-seed-to-strapi.js`](../scripts/import-seed-to-strapi.js) (seed to local Strapi)
> plus `strapi transfer` (local to Render), backed by the additive cms schema edits (section 4: `facet.name`,
> the `shop` self-relation, `type:"shop"`, and the section 9 pagination config). `USE_API=true` now
> renders identically to the static seed, with **no `web/` changes needed**.
>
> **End-product model:** **Render Strapi is the live source** the deployed site reads (`USE_API=true`);
> **`seed.json` is the git-versioned backup** (refresh it from Render with a `dump-seed`-style snapshot;
> it also lets teammates dev offline with `USE_API=false`, the committed default). Edits to existing
> entries (for example curating `data.imageUrls`) cost **zero quota**; only new records count against the
> roughly 500-entry cap. Reservations are now live writes (one row each), but at demo volumes they are
> negligible, and un-reserving flips a record to `cancelled` rather than adding rows.
