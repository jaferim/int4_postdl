// src/lib/graph.js

// Strapi { facets, edges }  ->  d3-force { nodes, links }
export function toGraph({ facets = [], edges = [] }) {
  // 1. Safely unwrap the Strapi 'data' layer if it exists. Only treat it as a wrapper when `.data` is itself an ARRAY of records ([{ data: [...], meta }] or { data: [...] }). A facet's own `data` blob (e.g. { imageUrls: [...] }) is an object, so it must NOT be mistaken for the wrapper.Otherwise we'd map over the wrong thing and crash!!!
  const unwrap = (x) =>
    Array.isArray(x?.[0]?.data) ? x[0].data
    : Array.isArray(x?.data) ? x.data
    : x;
  const actualFacets = unwrap(facets);
  const actualEdges = unwrap(edges);

  // 2. Map the unwrapped array
  const nodes = actualFacets.map((f) => ({
    idNr: f.id,
    id: f.documentId,
    title: f.title,
    subtitle: f.subtitle ?? null,
    type: f.type,
    availability: f.availability ?? null,
    price: f.price ?? null,
    shop: f.shop?.name ?? null,
    curator: f.curator?.name ?? null,
    tags: (f.tags ?? []).map((t) => t.label),
    media: f.media ?? [],
    /* Victoria's sourced images for this facet, stored as path strings in the facet's `data.imageUrls` blob (see scripts/apply-images-to-seed.js).
    Exposed on the node as a single `images` array (empty when none yet): the hover collage maps over it, and the glass texture uses images[0]. 
    ItemNode falls back to placeholders when it's empty.*/
    images: f.data?.imageUrls ?? [],
    // retail subtype for shop facets (boutique, vintage_store…); null for items
    shopType: f.data?.shopType ?? null,
    // optional product specs. Seed these into the facet's `data` blob to populate the ItemDetail spec table (each row renders only when its value exists)
    material: f.data?.material ?? null,
    condition: f.data?.condition ?? null,
    brand: f.data?.brand ?? null,
    sizes: f.data?.sizes ?? null,
  }));

  // Guard: drop any edge whose endpoints aren't both present
  const ids = new Set(nodes.map((n) => n.id));

  const links = actualEdges
    .map((e) => ({
      source: e.source?.documentId,
      target: e.target?.documentId,
      relationType: e.relationType,
      weight: e.weight ?? 0.5,
    }))
    .filter((l) => ids.has(l.source) && ids.has(l.target));

  // Real item count per moodboard, from the `contains` edges that point at an item (replaces MoodNode's old hardcoded "12 items"). Keyed by node id.
  const typeById = new Map(nodes.map((n) => [n.id, n.type]));
  const itemCount = new Map();
  for (const l of links) {
    if (l.relationType !== "contains") continue;
    if (typeById.get(l.source) === "moodboard" && typeById.get(l.target) === "item")
      itemCount.set(l.source, (itemCount.get(l.source) ?? 0) + 1);
    else if (typeById.get(l.target) === "moodboard" && typeById.get(l.source) === "item")
      itemCount.set(l.target, (itemCount.get(l.target) ?? 0) + 1);
  }
  for (const n of nodes) {
    if (n.type === "moodboard") n.itemCount = itemCount.get(n.id) ?? 0;
  }

  return { nodes, links };
}
