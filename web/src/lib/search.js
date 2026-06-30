// src/lib/search.js

/*** Client-side search over the graph. *** 

Builds a flat, scored index of the facets that have a detail page (items, shops) plus the curators, so a query lands the visitor somewhere concrete. Moodboards and vibes are canvas-only (no detail route), so they're left out to avoid dead-end results. 

Pure functions, no React: the overlay calls buildIndex once per data change and searchIndex per keystroke. ***/

import { sizedImage } from "./images.js";

const ITEM_PLACEHOLDER = "/assets/images/shop-photo.png";

// Strip accents and lowercase so "cafe" matches "Café" and casing never matters.
function normalize(str) {
  return (str ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// One searchable entry. `fields` is the weighted bag of text we match against; `to` is where a click navigates; `tags` rides along so the row can show which tags matched.
function makeEntry({ key, kind, title, subtitle, image, to, tags = [], fields }) {
  return {
    key,
    kind,
    title,
    subtitle,
    image,
    to,
    tags,
    // Pre-normalize every field once at index time so matching per keystroke is just substring checks, not repeated normalize() calls.
    _fields: fields.map((f) => ({ ...f, text: normalize(f.value) })),
    _tags: tags.map(normalize),
  };
}

// Turn graph nodes + curators into the flat search index. Called once whenever the data changes, not per keystroke.
export function buildIndex(nodes = [], curators = []) {
  const entries = [];

  for (const n of nodes) {
    if (n.type === "item") {
      entries.push(
        makeEntry({
          key: `item-${n.id}`,
          kind: "item",
          title: n.title,
          subtitle: [n.shop, n.brand].filter(Boolean).join(" · ") || "Item",
          image: n.images?.[0] ? sizedImage(n.images[0], 96) : ITEM_PLACEHOLDER,
          to: `/${n.idNr}`,
          tags: n.tags ?? [],
          fields: [
            { value: n.title, weight: 10 },
            { value: (n.tags ?? []).join(" "), weight: 6 },
            { value: n.shop, weight: 4 },
            { value: n.brand, weight: 4 },
            { value: n.subtitle, weight: 3 },
            { value: n.material, weight: 2 },
            { value: n.curator, weight: 2 },
          ],
        }),
      );
    } else if (n.type === "shop") {
      const typeLabel = (n.shopType ?? "").replace(/_/g, " ") || "Concept store";
      entries.push(
        makeEntry({
          key: `shop-${n.id}`,
          kind: "shop",
          title: n.title,
          subtitle: typeLabel,
          image: n.images?.[0] ? sizedImage(n.images[0], 96) : ITEM_PLACEHOLDER,
          to: `/shops/${encodeURIComponent(n.title)}`,
          tags: n.tags ?? [],
          fields: [
            { value: n.title, weight: 10 },
            { value: (n.tags ?? []).join(" "), weight: 6 },
            { value: typeLabel, weight: 4 },
            { value: n.subtitle, weight: 3 },
          ],
        }),
      );
    }
  }

  for (const c of curators) {
    entries.push(
      makeEntry({
        key: `curator-${c.slug}`,
        kind: "curator",
        title: c.name,
        subtitle: c.subculture || "Curator",
        image: c.avatar,
        to: `/curators/${c.slug}`,
        tags: [],
        fields: [
          { value: c.name, weight: 10 },
          { value: c.subculture, weight: 6 },
          { value: c.handle, weight: 5 },
          { value: c.tone, weight: 2 },
          { value: c.bio, weight: 1 },
        ],
      }),
    );
  }

  return entries;
}

// Score one entry against a normalized query. A field scores its weight for a substring hit, doubled when the field starts with the query (so "den" ranks "Denim jacket" above "Acid-wash denim"). Returns 0 for no match so the caller can drop it.
function scoreEntry(entry, q) {
  let score = 0;
  for (const f of entry._fields) {
    if (!f.text) continue;
    const i = f.text.indexOf(q);
    if (i === -1) continue;
    score += i === 0 ? f.weight * 2 : f.weight;
  }
  return score;
}

// Which of an entry's tags contain the query, so the row can surface them.
export function matchedTags(entry, query) {
  const q = normalize(query);
  if (!q) return [];
  return entry.tags.filter((_, idx) => entry._tags[idx].includes(q));
}

// Run a query against the index. Empty query returns nothing (the overlay shows its tag suggestions instead). Ties break by kind (items first) then title, so the order is stable rather than index-order.
const KIND_RANK = { item: 0, shop: 1, curator: 2 };

export function searchIndex(index, query, limit = 40) {
  const q = normalize(query);
  if (!q) return [];
  const scored = [];
  for (const entry of index) {
    const score = scoreEntry(entry, q);
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      KIND_RANK[a.entry.kind] - KIND_RANK[b.entry.kind] ||
      a.entry.title.localeCompare(b.entry.title),
  );
  return scored.slice(0, limit).map((s) => s.entry);
}

// The most common tags across the index, for the empty-state suggestion chips. Tapping one is the same as typing it, so tags are a first-class way in.
export function popularTags(index, limit = 12) {
  const counts = new Map();
  for (const entry of index) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}
