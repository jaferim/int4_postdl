// scripts/strapi.js
// A tiny, heavily-commented helper for talking to our LOCAL Strapi REST API.
// Shared by tag-facets.js and embed-and-link.js so we don't repeat ourselves.

import "dotenv/config"; // loads variables from scripts/.env into process.env

// Where Strapi lives. We ALWAYS use local Strapi for these bulk scripts so we
// don't burn through the cloud free-plan limits. Override via .env if you must.
export const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";

const TOKEN = process.env.STRAPI_TOKEN;
if (!TOKEN) {
  throw new Error(
    "Missing STRAPI_TOKEN in scripts/.env — create one in Strapi admin → Settings → API Tokens.",
  );
}

// Every request carries our API token so Strapi knows we're allowed in.
const authHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${TOKEN}`,
};

// Pause helper — used to space out AI calls so we stay under free-tier rate limits.
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch EVERY entry in a collection, following Strapi's pagination.
// `query` is an optional extra query string, e.g. "populate=tags".
export async function strapiGetAll(collection, query = "") {
  const all = [];
  let page = 1;
  let pageCount = 1;

  do {
    const extra = query ? `&${query}` : "";
    // pageSize 100 keeps the number of requests tiny for our small dataset.
    const url = `${STRAPI_URL}/api/${collection}?pagination[page]=${page}&pagination[pageSize]=100${extra}`;
    const res = await fetch(url, { headers: authHeaders });
    if (!res.ok) {
      throw new Error(`GET ${url} failed: ${res.status} ${await res.text()}`);
    }
    const json = await res.json();
    // Strapi 5 responses are "flat": each item has id, documentId, and its
    // fields directly on the object (no more nested `.attributes`).
    all.push(...json.data);
    pageCount = json.meta.pagination.pageCount;
    page += 1;
  } while (page <= pageCount);

  return all;
}

// Update one entry by its documentId.
// (Strapi 5 uses the string documentId — not the numeric id — in URLs.)
export async function strapiUpdate(collection, documentId, data) {
  const url = `${STRAPI_URL}/api/${collection}/${documentId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ data }), // Strapi always wants the body wrapped in { data: ... }
  });
  if (!res.ok) {
    throw new Error(`PUT ${url} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).data;
}

// Create one new entry.
export async function strapiCreate(collection, data) {
  const url = `${STRAPI_URL}/api/${collection}`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    throw new Error(`POST ${url} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).data;
}
