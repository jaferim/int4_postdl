// src/lib/curator-state.jsx

/*** Holds the one piece of curator state the app shares: which curator is *active*. 
 
The active curator drives the site's colour theme (App applies it) and the homepage's centred moodboard, and is the highlighted chip in the curator bar. It's persisted so a return visit lands the same way, and it defaults to the first curator (the onboarding "auto-pick" until that flow is wired). 

Selecting a curator anywhere (bar or detail page) updates it.***/

import { useCallback, useEffect, useMemo, useState } from "react";
import { CuratorContext } from "./curator-context.js";
import { CURATORS, getCuratorBySlug } from "./curators.js";

const STORAGE_KEY = "karat-active-curator";

function readStored() {
  try {
    const slug = localStorage.getItem(STORAGE_KEY);
    return slug && getCuratorBySlug(slug) ? slug : "fleur";
  } catch {
    return "fleur";
  }
}

export function CuratorProvider({ children }) {
  const [activeSlug, setActiveSlug] = useState(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeSlug);
    } catch {
      /* storage disabled — keep working in-memory for this session */
    }
  }, [activeSlug]);

  const setActiveCurator = useCallback((slug) => {
    if (getCuratorBySlug(slug)) setActiveSlug(slug);
  }, []);

  const activeCurator = useMemo(
    () => getCuratorBySlug(activeSlug),
    [activeSlug],
  );

  const value = {
    curators: CURATORS,
    activeSlug,
    activeCurator,
    setActiveCurator,
  };

  return (
    <CuratorContext.Provider value={value}>{children}</CuratorContext.Provider>
  );
}
