// src/lib/loading-context.jsx
// One shared "is the app mid-load/transition" signal. Any view registers itself
// as a loading source (by a stable key) while it's fetching or spinning up its
// 3D/GSAP scene; the layout (App) reads `isLoading` to (a) show a single,
// consistent loading overlay and (b) hide the top nav + bottom curator bar so
// they're never visible or clickable over a loading screen.
//
// Keyed + counted on purpose: multiple sources can be active at once (e.g. a
// route change while the graph is still warming up) and the overlay only clears
// once every source has finished.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [keys, setKeys] = useState(() => new Set());

  const setLoading = useCallback((key, active) => {
    setKeys((prev) => {
      if (active === prev.has(key)) return prev; // no-op, keep identity stable
      const next = new Set(prev);
      if (active) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isLoading: keys.size > 0, setLoading }),
    [keys, setLoading],
  );

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used within a LoadingProvider");
  return ctx;
}

// Register this component as a loading source while `active` is true. Clears the source on unmount so a view that navigates away mid-load never leaves the overlay stuck on.
export function useLoadingSource(key, active) {
  const { setLoading } = useLoading();
  useEffect(() => {
    setLoading(key, active);
    return () => setLoading(key, false);
  }, [key, active, setLoading]);
}
