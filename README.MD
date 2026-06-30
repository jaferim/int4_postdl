# kar.at

> A discovery platform for the city of Antwerp, built for fashion-focused young urban travellers.

The name comes from the Dutch word for carat (*karaat*), a nod to Antwerp's history as the diamond capital of the world. But Antwerp has many more facets than diamonds, and this site is here to show them.

---

## What is it?

Kar.at is an interactive, infinite canvas where visitors explore Antwerp's local fashion scenes, curated by people who actually live them. Instead of a list of tourist landmarks, the site presents a **force-directed graph** of connected places, items, and vibes; users can drag, pull, and click anything to learn more.

Visitors can:

- **Explore** the graph freely: pan, zoom, and follow the connections
- **Search** items, shops, and curators from anywhere (nav search bar, or Cmd/Ctrl+K)
- **Save** spots and items to a personal Vault (no account needed)
- **Reserve** products ahead of their visit with just travel dates, a name, and an email, getting a pickup reference to show in store
- **Hand off** their Vault to another device by sharing or scanning a link

No payment is collected; a reservation is a heads-up, not a transaction. The Vault (saved items, trip dates, reservations) lives on the visitor's device, and reserving now also records the request in the CMS so the shop owner sees it in their admin (un-reserving cancels it). Saving works for both items and shops.

The app also fails gracefully: a recoverable data-fetch problem shows a "Try again" screen, an unexpected runtime error shows a friendly branded crash screen with a reload, and visitors with JavaScript disabled get a clear no-script fallback instead of a blank page.

---

## Project structure

```text
/
├── cms/       # Strapi 5: headless CMS, database, and admin panel
├── web/       # React 19 + Vite: the canvas app (what visitors see)
├── scripts/   # Node.js scripts for seeding, images, and AI enrichment
└── .github/   # Architecture docs, coding guidelines, PR template
```

- **`cms/`** handles all data storage and the shop-owner admin interface. It runs as a separate service; the frontend reads from it over a REST API.
- **`web/`** is the visitor-facing app: an interactive WebGL canvas built with React Three Fiber and d3-force.
- **`scripts/`** are seeding and enrichment tools that run locally before deployment. They populate the graph data and use a local AI model (Ollama) to auto-tag content and generate similarity edges between related items. They never run as part of the live app.

For the full technical breakdown (data model, rendering approach, AI script details, and deployment config) see [`.github/architecture.md`](.github/architecture.md).

---

## System requirements

| Requirement | Details |
| --- | --- |
| Operating system | macOS, Windows, or Linux (developed on macOS). |
| Node.js | **20 to 24** (developed on Node 22). Get it from [nodejs.org](https://nodejs.org). |
| npm | 6+ (ships with Node). |
| Browser | Any modern browser with **WebGL** (Chrome, Edge, Firefox, Safari). The canvas is a WebGL scene. |
| Internet | **Not required** to run the app in its default offline mode (it reads the bundled `seed.json`). Only needed to `npm install` the dependencies, and to use the optional live-API mode. |
| Disk | Roughly 1 to 2 GB for `node_modules` across the workspaces. |

No paid accounts, API keys, or passwords are needed to run the app. See [Configuration and secrets](#configuration-and-secrets) below.

---

## Running locally

### Quickest start: the canvas app, no backend, no internet

The frontend ships with a committed data snapshot (`web/src/data/seed.json`), so it runs **fully standalone** with nothing else set up. This is the recommended way to try the project.

```bash
cd web
npm install
npm run dev
# Open http://localhost:5173
```

That is it. With no `.env.local` present, `VITE_USE_API` defaults to off and the app reads `seed.json` directly, so **no CMS, no internet, and no keys are required**.

### Optional: point the frontend at the live hosted CMS

If you want the app to read live data from the hosted Strapi instead of the snapshot:

```bash
cd web
cp .env.example .env.local     # sets VITE_USE_API=true and the hosted Strapi URL
npm install
npm run dev
```

This needs an internet connection. The hosted CMS is on a free tier that sleeps when idle, so the first load may take 30 to 60 seconds to wake it (the app shows a loader and retries automatically).

### Optional: run the CMS (Strapi) locally

Only needed to change content types, run the data pipeline, or host the data yourself:

```bash
cd cms
cp .env.example .env            # fill the secret fields with random values (see the file's notes)
npm install
npm run develop
# Admin panel at http://localhost:1337/admin (create an admin login on first run)
```

Local dev uses SQLite, so there is no separate database to install. To then point the frontend at this local CMS, set `VITE_STRAPI_URL=http://localhost:1337` and `VITE_USE_API=true` in `web/.env.local`. To load the dataset into a fresh local Strapi, run `scripts/import-seed-to-strapi.js` (see below).

### Optional: scripts (data pipeline and AI enrichment)

Only needed when changing the dataset or running AI enrichment. See [`scripts/README.md`](scripts/README.md) for the full per-script reference.

```bash
cd scripts
npm install
cp .env.example .env            # fill in STRAPI_TOKEN (no AI key needed, Ollama is local)
node apply-data-edits.js        # dry run by default; DRY_RUN=false to write
```

---

## Configuration and secrets

Nothing secret is committed. Each part of the project reads its config from a local `.env` file that is gitignored; every folder ships a `.env.example` template to copy. **The default offline app needs none of these.**

| File | Copy to | Needed for | Key variables |
| --- | --- | --- | --- |
| `web/.env.example` | `web/.env.local` | Live-API mode (optional) | `VITE_USE_API` (off by default to use `seed.json`), `VITE_STRAPI_URL` (CMS base URL) |
| `cms/.env.example` | `cms/.env` | Running Strapi locally | Strapi secrets (`APP_KEYS`, `*_SALT`, `*_SECRET`, `ENCRYPTION_KEY`) and `DATABASE_CLIENT` (SQLite locally). The secrets can be any random strings for local dev; the file explains how to generate them. |
| `scripts/.env.example` | `scripts/.env` | Running the data scripts | `STRAPI_TOKEN` (a token you create in Strapi admin). The AI runs locally via Ollama, so there is **no AI key, no account, no billing**. |

The production deploy sets its own secrets in the Render and Netlify dashboards; those are never stored in the repo. For the full deployment configuration see [`.github/architecture.md`](.github/architecture.md) section 9.

---

## Live deployment

| Service | Host | URL |
| --- | --- | --- |
| Frontend | Netlify (static, auto-deploys from `main`) | live site |
| CMS (Strapi) | Render (free tier) | [int4-team15.onrender.com](https://int4-team15.onrender.com) |

The Netlify build uses base directory `web`, build command `npm run build`, and publish directory `web/dist`. The app uses hash routing, so the static host needs no rewrite rules.

The CMS is on Render's free tier and **spins down after 15 minutes of inactivity**, so expect a cold start of roughly 30 to 60 seconds on the first request. The frontend handles this with a loading screen, a 60 second timeout, and one automatic retry.

---

## Team

Team 15, Integration 4 '25 to '26: three students from Devine (Digital Design and Development) at Hogeschool West-Vlaanderen (Howest), Belgium.

| Name | Role | Primary responsibilities | Secondary responsibilities |
| --- | --- | --- | --- |
| Victoria Argazova | Social media campaign manager | Conceptualise and produce the social media campaign videos | Research style subcultures and material relevant to website content; process microsite design |
| Idris Belabed | Lead designer and developer | Designer of the digital platform; main front-end development | Ensure cohesiveness of the design across all deliverables |
| Nabilah Binti Zulkifly | Experience designer and developer | Ensure smooth UX in all aspects of the project; backend & support development | Scrum master; process website content |

---

## Relevant links

- [Miro](https://miro.com/app/board/uXjVHRrezfo=/?share_link_id=274115650584): initial brainstorming and planning
- [Figma](https://www.figma.com/design/odRffK4zdN8rRgTGtQm3KQ/Integration-4?node-id=0-1&t=QZAf2GZgmCdLpgY2-1): wireframes and design
- [GitHub Repository](https://github.com/fnabilahv/Int4_Team15)
