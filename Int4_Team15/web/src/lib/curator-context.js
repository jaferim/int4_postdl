// src/lib/curator-context.js
// Context + consumer hook for the active curator, kept separate from the provider component (mirrors vault-context.js) so this file exports no components and React Fast Refresh stays happy.
import { createContext, useContext } from "react";

export const CuratorContext = createContext(null);

export function useCurator() {
  const ctx = useContext(CuratorContext);
  if (!ctx) throw new Error("useCurator must be used within a CuratorProvider");
  return ctx;
}
