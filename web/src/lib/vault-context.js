// src/lib/vault-context.js

// Context object + consumer hook, kept separate from the provider component so the file exports no components (mirrors MaterialsContext / SharedMaterialsProvider, and keeps React Fast Refresh happy).

import { createContext, useContext } from "react";

export const VaultContext = createContext(null);

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within a VaultProvider");
  return ctx;
}
