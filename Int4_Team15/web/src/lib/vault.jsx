// src/lib/vault.jsx

/*** The Vault is client-side and local-first: it lives in the browser (localStorage) so it's instant and needs no account. This provider holds the saved-item snapshots, the visitor's trip dates, and the open/closed state of the drawer, so any component (the canvas, ItemDetail, the trigger button) can read or mutate it. ***/

import { useCallback, useEffect, useMemo, useState } from "react";
import { VaultContext } from "./vault-context.js";
import { cancelReservation } from "./reservations.js";

const STORAGE_KEY = "karat-vault";
const DATES_KEY = "karat-vault-dates";
const CONTACT_KEY = "karat-vault-contact";

// A short, human-readable pickup reference shown to the shop (e.g. "KRT-7F3A"). Generated client-side — ambiguous characters (0/O/1/I) are dropped so it's easy to read aloud or off a screen.
function makeReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KRT-${code}`;
}

// Hand-off: the whole Vault (items + dates + contact) is squeezed into a URL so another device can adopt it by simply opening the link, with no account and no backend. It rides in the QUERY STRING, not the hash: this is a HashRouter app, so the hash is the route, and a payload there boots the router at a location it can't match (the page hangs until a refresh). The payload is URL-safe base64 (base64url), which both keeps the QR dense and survives query parsing untouched (standard base64's +, / and = get mangled in a query value).
const PARAM = "vault";

function encodeVault(snapshot) {
  const json = JSON.stringify(snapshot);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeVault(payload) {
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const json = decodeURIComponent(escape(atob(padded)));
  return JSON.parse(json);
}

// If this page was opened from a hand-off link, decode the Vault it carries and strip the payload from the address bar (so a refresh doesn't re-import or leak it), keeping the hash route so the router stays put. Returns the decoded snapshot or null. Called once to seed initial state: reading the URL is start-up input, not something to reconcile in an effect.
function readHandoff() {
  try {
    const payload = new URLSearchParams(window.location.search).get(PARAM);
    if (!payload) return null;
    const data = decodeVault(payload);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.hash,
    );
    return data;
  } catch {
    return null;
  }
}

// Read once at startup; tolerate a missing/corrupt value so a bad blob never hard-crashes the app (just starts the visitor with an empty Vault).
function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Trip dates are { start, end } (ISO "YYYY-MM-DD" strings) or null when unset.
function readStoredDates() {
  try {
    const raw = localStorage.getItem(DATES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.start ? parsed : null;
  } catch {
    return null;
  }
}

// Contact is { name, email } or null. Saved once so the visitor only enters them on their first reservation, then reuses it for the rest of the trip.
function readStoredContact() {
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

export function VaultProvider({ children }) {
  // Seed from a hand-off link if present (read once), else from localStorage.
  // When a Vault is handed off we adopt it wholesale and open the drawer so the visitor sees it landed; the persist effects then write it to this device.
  const [handoff] = useState(readHandoff);
  const [items, setItems] = useState(() =>
    Array.isArray(handoff?.items) ? handoff.items : readStored(),
  );
  const [dates, setDatesState] = useState(() =>
    handoff?.dates?.start ? handoff.dates : readStoredDates(),
  );
  const [contact, setContactState] = useState(() =>
    handoff?.contact?.email ? handoff.contact : readStoredContact(),
  );
  const [isOpen, setIsOpen] = useState(!!handoff);

  // Persist on every change; this is the whole point of "local-first".
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / disabled -> keep working in-memory for this session */
    }
  }, [items]);

  useEffect(() => {
    try {
      if (dates) localStorage.setItem(DATES_KEY, JSON.stringify(dates));
      else localStorage.removeItem(DATES_KEY);
    } catch {
      /* storage full / disabled -> keep working in-memory for this session */
    }
  }, [dates]);

  useEffect(() => {
    try {
      if (contact) localStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
      else localStorage.removeItem(CONTACT_KEY);
    } catch {
      /* storage full / disabled -> keep working in-memory for this session */
    }
  }, [contact]);

  // Build the hand-off link encoding the current Vault. Points at wherever the app is hosted so the QR works across devices (in local dev it'll be localhost, which only scans on the same machine/network). The "#/" keeps the link opening on the home canvas under the HashRouter.
  const getHandoffUrl = useCallback(() => {
    const payload = encodeVault({ v: 1, items, dates, contact });
    const { origin, pathname } = window.location;
    return `${origin}${pathname}?${PARAM}=${payload}#/`;
  }, [items, dates, contact]);

  const isSaved = useCallback((id) => items.some((it) => it.id === id), [items]);

  // Save when absent, remove when present. the Add button is a single toggle.
  const toggle = useCallback((item) => {
    setItems((prev) =>
      prev.some((it) => it.id === item.id)
        ? prev.filter((it) => it.id !== item.id)
        : [...prev, item],
    );
  }, []);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const hasDates = !!dates;

  // Trip dates gate reservations: you can't reserve an item without telling us when you're visiting. Setting null clears them.
  const setDates = useCallback((next) => {
    setDatesState(next && next.start ? next : null);
  }, []);

  const clearDates = useCallback(() => setDatesState(null), []);

  const hasContact = !!contact;

  // Persist contact (name + email) for reuse on later reservations. Setting null clears it.
  const setContact = useCallback((next) => {
    setContactState(next && next.email ? next : null);
  }, []);

  /*** Reserve flips a flag on the saved item rather than moving it to a separate list. So an item is never lost, and un-reserving just returns it to Saved. ***

  A pickup reference is minted on first reserve and kept across re-reserves.
  The trip-dates gate is enforced at the UI (the reserve flow collects dates before it can commit). This stays side-effect-free (the server write is the caller's job, in the reserve flow) and RETURNS the reference so the caller can include it in that server record. see lib/reservations.js. ***/
  const reserve = useCallback(
    (id) => {
      const existing = items.find((it) => it.id === id);
      const reference = existing?.reference || makeReference();
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                reserved: true,
                reference: it.reference || reference,
                reservedAt: it.reservedAt || Date.now(),
              }
            : it,
        ),
      );
      return reference;
    },
    [items],
  );

  // Un-reserve mirrors to the server: tell the shop the request is off before we drop the reference locally (cancel matches on it). Fire-and-forget: the local clear is the source of truth and never waits on the network.
  const unreserve = useCallback(
    (id) => {
      const target = items.find((it) => it.id === id);
      if (target?.reference) cancelReservation({ reference: target.reference });
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, reserved: false, reference: undefined, reservedAt: undefined }
            : it,
        ),
      );
    },
    [items],
  );

  // Revert every reservation back to Saved at once. Used when the trip dates change. The dates are what the shop holds the item against, so altering them invalidates the existing requests. Cancel each one server-side too.
  const unreserveAll = useCallback(() => {
    items.forEach((it) => {
      if (it.reserved && it.reference) {
        cancelReservation({ reference: it.reference });
      }
    });
    setItems((prev) =>
      prev.map((it) =>
        it.reserved
          ? { ...it, reserved: false, reference: undefined, reservedAt: undefined }
          : it,
      ),
    );
  }, [items]);

  const savedItems = useMemo(
    () => items.filter((it) => !it.reserved),
    [items],
  );
  const reservedItems = useMemo(
    () => items.filter((it) => it.reserved),
    [items],
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggleOpen = useCallback(() => setIsOpen((o) => !o), []);

  const value = {
    items,
    count: items.length,
    savedItems,
    reservedItems,
    isSaved,
    toggle,
    remove,
    clear,
    dates,
    hasDates,
    setDates,
    clearDates,
    contact,
    hasContact,
    setContact,
    reserve,
    unreserve,
    unreserveAll,
    getHandoffUrl,
    isOpen,
    open,
    close,
    toggleOpen,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}
