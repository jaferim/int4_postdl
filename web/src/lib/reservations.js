// src/lib/reservations.js

/***The server side of a reservation. *** 

The Vault is local-first (the reserve flag, the pickup reference and the trip dates all live in the browser), so this is purely additive: when a visitor confirms a reservation we also POST a record to Strapi so the shop has something to act on. It is deliberately fire-and-forget; if the CMS is asleep (Render cold-starts after 15 min idle) or unreachable, the local reservation still stands and we just don't have a server copy. 

We never block or fail the reserve UI over the network.

Same data-source gate as load.js: only talk to Strapi in the deployed build (VITE_USE_API=true). In seed/offline mode reservations stay local-only. ***/

const USE_API = import.meta.env.VITE_USE_API === "true";
const API = `${import.meta.env.VITE_STRAPI_URL || "http://localhost:1337"}/api`;

// Render free-plan cold starts can take ~30-60s; bound the wait so a hung request can't pin a promise open forever, but give a cold start room to wake.
const POST_TIMEOUT_MS = 60_000;

// Build the Strapi create body from a saved Vault item plus the resolved trip dates and contact. Only product facets are reservable (shops aren't), and a saved item's `id` is the facet's documentId, so we connect the facet relation by it. We don't connect the shop relation: the facet already carries its shop, and we only hold the shop's name here, not its documentId.
function toCreateBody({ item, dates, contact, reference }) {
  return {
    data: {
      name: contact?.name || null,
      email: contact?.email || null,
      reference: reference || null,
      reservationStatus: "requested",
      visitStart: dates?.start || null,
      visitEnd: dates?.end || dates?.start || null,
      // The hold lapses at the end of the visit window.
      expiresAt: dates?.end || dates?.start
        ? `${dates.end || dates.start}T23:59:59`
        : null,
      facet: item?.id || undefined,
    },
  };
}

// Record a reservation server-side. Resolves to the created record's documentId on success, or null on any failure (network, timeout, cold start, non-2xx). Callers treat a null as "couldn't sync" and carry on with the local copy.
export async function createReservation({ item, dates, contact, reference }) {
  if (!USE_API) return null;
  if (!item?.id) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toCreateBody({ item, dates, contact, reference })),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`POST /reservations → HTTP ${res.status}`);
    const json = await res.json();
    console.log(`📡 reservation synced → ${reference || json?.data?.documentId}`);
    return json?.data?.documentId ?? null;
  } catch (err) {
    const why =
      err?.name === "AbortError"
        ? `timed out after ${POST_TIMEOUT_MS}ms`
        : err?.message;
    console.warn(`reservation: server write failed (kept locally) — ${why}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Cancel a reservation server-side when the visitor un-reserves. We match on the pickup reference (the capability the visitor holds), via the custom POST /reservations/cancel route; the Public role can't list or edit reservations directly. Same fire-and-forget contract as create: the local un-reserve is the source of truth and never waits on or fails over this. The server route is idempotent, so a missed/duplicate cancel is harmless.
export async function cancelReservation({ reference }) {
  if (!USE_API) return false;
  if (!reference) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API}/reservations/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`POST /reservations/cancel → HTTP ${res.status}`);
    console.log(`📡 reservation cancelled → ${reference}`);
    return true;
  } catch (err) {
    const why =
      err?.name === "AbortError"
        ? `timed out after ${POST_TIMEOUT_MS}ms`
        : err?.message;
    console.warn(`reservation: server cancel failed (cleared locally) — ${why}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
