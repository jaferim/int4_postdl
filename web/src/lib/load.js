// src/lib/load.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { toGraph } from "./graph";
import seed from "../data/seed.json";

// Read live from Strapi when VITE_USE_API=true (set in the deployed build); otherwise fall back to the static seed.json snapshot — the safe default so local dev never breaks just because Strapi isn't running.
const USE_API = import.meta.env.VITE_USE_API === "true";
// Strapi base URL: the hosted CMS via env var in the deploy, localhost in dev.
const API = `${import.meta.env.VITE_STRAPI_URL || "http://localhost:1337"}/api`;

// Render's free plan spins the service down after 15 min idle; the first hit then cold-starts for ~30–60s. Give each request a generous-but-bounded timeout and one retry so a cold start resolves on its own, but a genuinely dead/unreachable API surfaces as an error instead of hanging forever.
const FETCH_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 2;

// Prints on every load so you can see at a glance which mode you're in:
//   "📡 LIVE API → <url>"  = reading from Strapi
//   "📦 seed.json (static)" = reading the static snapshot
console.log(USE_API ? `📡 load: LIVE API → ${API}` : "📦 load: seed.json (static)");

async function fetchJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()).data;
}

async function fetchFromApi() {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const [facets, edges] = await Promise.all([
        fetchJson(`${API}/facets?populate=*`, controller.signal),
        fetchJson(`${API}/edges?populate=*`, controller.signal),
      ]);
      return { facets, edges };
    } catch (err) {
      lastErr = err;
      const why = err?.name === "AbortError" ? `timed out after ${FETCH_TIMEOUT_MS}ms` : err?.message;
      console.warn(`load: API attempt ${attempt}/${MAX_ATTEMPTS} failed — ${why}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

// useGraph() returns the d3 graph plus a load lifecycle:
// { nodes, links, status: "loading" | "ready" | "error", error, retry }
// The `.nodes`/`.links` shape is unchanged, so existing consumers keep working; `status` + `retry` let the top-level view show a recoverable error instead of an indefinite loading screen. Seed mode is synchronous (no flash, no fetch).
export function useGraph() {
  const [state, setState] = useState(() =>
    USE_API
      ? { nodes: [], links: [], status: "loading", error: null }
      : { ...toGraph(seed), status: "ready", error: null },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!USE_API) return; // seed mode resolved in the initial state
    let alive = true;
    setState((s) => ({ ...s, status: "loading", error: null }));
    (async () => {
      try {
        const graph = toGraph(await fetchFromApi());
        if (!alive) return;
        // An empty payload (e.g. wrong populate/paused DB) would render blank canvas. Treat it as an error so user can retry instead.
        if (graph.nodes.length === 0) throw new Error("API returned an empty graph");
        setState({ ...graph, status: "ready", error: null });
      } catch (err) {
        if (!alive) return;
        console.error("load: graph fetch failed", err);
        setState((s) => ({ ...s, status: "error", error: err }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  // Stable identity: only changes when `state` actually changes (a fetch lifecycle transition), never on an unrelated parent re-render. Consumers pass this object into effect deps (e.g. GraphScene rebuilds its d3 simulation when rawGraphData changes) — a fresh object every render would wipe out dragged node positions on any App re-render (e.g. zoom crossing the detail threshold flips hideDetails → App re-renders → graph reset).
  return useMemo(() => ({ ...state, retry }), [state, retry]);
}
