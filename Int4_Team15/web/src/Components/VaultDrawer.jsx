import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useVault } from "../lib/vault-context.js";
import { createReservation } from "../lib/reservations.js";
import { mapUrlFor } from "../lib/maps.js";
import Vault from "./jsx-assets/Vault.jsx";
import Calendar from "./jsx-assets/Calendar.jsx";
import Phone from "./jsx-assets/Phone.jsx";

// Render a saved trip-date range like "12 – 15 Jul 2026" (or a single day).
const formatRange = ({ start, end }) => {
  const fmt = (iso, opts) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", opts);
  if (!end || end === start)
    return fmt(start, { day: "numeric", month: "short", year: "numeric" });
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const startStr = sameMonth
    ? fmt(start, { day: "numeric" })
    : fmt(start, { day: "numeric", month: "short" });
  return `${startStr} – ${fmt(end, { day: "numeric", month: "short", year: "numeric" })}`;
};

const dateInputClass =
  "rounded-xs border border-text-main/30 bg-transparent px-2 py-2 text-text-main [color-scheme:light_dark]";

// True when `outer` fully covers `inner` (ISO "YYYY-MM-DD" strings sort lexicographically, so plain string compares work). Used to tell whether edited trip dates still cover the days reservations were made against. Widening the range keeps them, narrowing/shifting away drops them.
const rangeCovers = (outer, inner) =>
  !!outer &&
  !!inner &&
  outer.start <= inner.start &&
  (outer.end || outer.start) >= (inner.end || inner.start);

// A centred overlay dialog. Sits above the drawer; the backdrop closes it. `zClass` lets a confirmation stack above an already-open modal.
const Modal = ({ onClose, labelledBy, children, zClass = "z-[60]" }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 ${zClass} flex-centered p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-accentbg2 border border-text-main/20 rounded-sm p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

// A yes/no confirmation, stacked above any other modal. Used for the destructive actions in the Vault (changing dates with live reservations, cancelling a reservation) so they can't happen by accident.
const ConfirmModal = ({ title, message, confirmLabel, onConfirm, onClose }) => (
  <Modal onClose={onClose} labelledBy="confirm-title" zClass="z-[70]">
    <div>
      <h3 id="confirm-title" className="main-header text-text-main text-2xl">
        {title}
      </h3>
      <p className="p-reg text-text-secondary mt-2">{message}</p>
    </div>
    <div className="flex items-center justify-end gap-4">
      <button
        type="button"
        onClick={onClose}
        className="secondary-cta cursor-pointer"
      >
        Keep as is
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="reserve-pill border-primary-2 text-primary-2 hover:bg-primary-2/10 transition-colors cursor-pointer"
      >
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

// Trip dates row. Collapsed it shows the current range (or a prompt); the Edit button reveals two native date inputs. Setting dates needs no further action; it's the lightweight first step, separate from the heavier reserve flow.
const TripDates = ({ dates, onSave, onClear }) => {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(dates?.start || "");
  const [end, setEnd] = useState(dates?.end || "");

  const begin = () => {
    setStart(dates?.start || "");
    setEnd(dates?.end || "");
    setEditing(true);
  };

  const save = () => {
    if (!start) return;
    onSave({ start, end: end || start });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-8 rounded-xs border border-text-main/30 px-4 py-3">
        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-1 flex-col gap-2">
            <span className="p-reg-h font-body-light text-text-secondary">
              Arrival
            </span>
            <input
              type="date"
              value={start}
              max={end || undefined}
              onChange={(e) => setStart(e.target.value)}
              className={dateInputClass}
            />
          </label>
          <label className="flex flex-1 flex-col gap-2">
            <span className="p-reg-h font-body-light text-text-secondary">
              Departure
            </span>
            <input
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
              className={dateInputClass}
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-3">
          {dates && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setEditing(false);
              }}
              className="secondary-cta cursor-pointer"
            >
              Clear dates
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="secondary-cta cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!start}
            className="add-button px-4 h-fit py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="p-reg-h font-body-bold text-primary-2 whitespace-nowrap">
              SAVE
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xs border border-text-main/30 px-4 py-3">
      <span className="flex items-center gap-2 min-w-0">
        <Calendar />
        <span className="p-large-h text-text-main font-body-light truncate underline">
          {dates
            ? `Visiting Antwerp · ${formatRange(dates)}`
            : "Add your Antwerp visit dates"}
        </span>
      </span>
      <button
        type="button"
        onClick={begin}
        className="secondary-cta shrink-0 cursor-pointer"
      >
        Edit
      </button>
    </div>
  );
};

const emailLooksValid = (email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

/*** The reserve flow *** 

Always shown on Reserve (deliberate friction so people don't spam shops), but only asks for what's missing: trip dates if unset, then name + email on the first reservation. 

Reuses saved contact on later reservations. ***/
const ReserveModal = ({ item, dates, contact, onClose, onConfirm }) => {
  const needDates = !dates;
  const needContact = !contact;
  const [start, setStart] = useState(dates?.start || "");
  const [end, setEnd] = useState(dates?.end || "");
  const [name, setName] = useState(contact?.name || "");
  const [email, setEmail] = useState(contact?.email || "");

  const datesOk = !needDates || !!start;
  const contactOk = !needContact || (name.trim() && emailLooksValid(email));
  const canSubmit = datesOk && contactOk;

  const submit = () => {
    if (!canSubmit) return;
    onConfirm({
      newDates: needDates ? { start, end: end || start } : null,
      newContact: needContact
        ? { name: name.trim(), email: email.trim() }
        : null,
    });
  };

  return (
    <Modal onClose={onClose} labelledBy="reserve-title">
      <div>
        <p className="p-reg-h uppercase tracking-wide text-text-secondary mb-2">
          {needDates ? "First reserve" : "Reserve"}
        </p>
        <h3 id="reserve-title" className="main-header text-text-main text-2xl">
          {needDates
            ? "When are you visiting Antwerp?"
            : `Reserve ${item.title}`}
        </h3>
      </div>

      {needDates && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1">
              <span className="p-reg-h text-text-secondary">Arrival</span>
              <input
                type="date"
                value={start}
                max={end || undefined}
                onChange={(e) => setStart(e.target.value)}
                className={dateInputClass}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="p-reg-h text-text-secondary">Departure</span>
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
                className={dateInputClass}
              />
            </label>
          </div>
          <p className="caption text-text-secondary">
            These dates tell the shop when to expect you.
          </p>
        </div>
      )}

      {needContact && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="p-reg-h text-text-secondary">Your name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className={dateInputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="p-reg-h text-text-secondary">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={dateInputClass}
            />
          </label>
          <p className="caption text-text-secondary">
            We save this on this device so you only enter it once.
          </p>
        </div>
      )}

      <p className="p-reg text-text-secondary">
        Reserving lets the shop hold {item.title} for your visit.{" "}
        <span className="text-text-main">
          This is a request, not a payment.
        </span>
      </p>

      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onClose}
          className="secondary-cta cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="add-button px-4 h-fit py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="p-reg-h font-body-bold text-primary-2 whitespace-nowrap">
            Reserve
          </span>
        </button>
      </div>
    </Modal>
  );
};

// Shown when the visitor taps "Reservation details" on a reserved item: price, a tappable shop name that opens directions, the pickup reference to show in store, plus a way to cancel the reservation.
const ShowAtShopModal = ({ item, dates, onClose, onCancel }) => (
  <Modal onClose={onClose} labelledBy="show-title">
    <div>
      <p className="caption uppercase tracking-wide text-text-secondary">
        Reservation details
      </p>
      <h3 id="show-title" className="main-header text-text-main text-2xl">
        {item.title}
      </h3>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        {item.shop && (
          <a
            href={mapUrlFor(item.shop)}
            target="_blank"
            rel="noreferrer"
            title={`Open directions to ${item.shop} in Maps`}
            className="p-reg text-primary-2 underline inline-flex items-center gap-1 cursor-pointer"
          >
            <MapPinIcon />
            {item.shop}
          </a>
        )}
        {item.price != null && (
          <>
            {item.shop && <span className="text-text-secondary">·</span>}
            <span className="p-reg text-text-main">€{item.price}</span>
          </>
        )}
      </div>
    </div>

    <div className="rounded-xs border border-text-main/20 bg-text-main/5 px-4 py-5 text-center">
      <p className="caption uppercase tracking-wide text-text-secondary mb-1">
        Reference code
      </p>
      <p className="main-header text-text-main text-3xl tracking-widest">
        {item.reference}
      </p>
    </div>

    <p className="p-reg text-text-secondary">
      Show this code to the shop to purchase your item. They're expecting you
      {dates ? ` ${formatRange(dates)}` : ""}.
    </p>

    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onCancel}
        className="secondary-cta cursor-pointer"
      >
        Cancel reservation
      </button>
      <button
        type="button"
        onClick={onClose}
        className="add-button px-5 cursor-pointer"
      >
        <span className="p-large-h text-primary-2 whitespace-nowrap">Back</span>
      </button>
    </div>
  </Modal>
);

// True where the OS share sheet is available (effectively mobile). Used to give
// phones a real send-to-desktop route instead of a QR they can't point a laptop
// at. Computed once at module load; share support doesn't change at runtime.
const canShare =
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/*** Cross-device hand-off: the whole Vault is encoded into the URL, so the other device adopts it just by opening it (no account, no server round-trip). ***

Three ways across: SCAN the QR (laptop to phone), SHARE via the native sheet (the natural phone to laptop path, e.g. AirDrop, email, messages), or COPY the link as a universal fallback. 

Share only shows on devices that have the Web Share API (mobile), so phones get a one-tap route to a laptop rather than a QR code no laptop can read. QR sits on white for reliable scanning in any theme. ***/
const SendToPhoneModal = ({ url, count, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API blocked (insecure context / permissions); surface the link so the user can copy it by hand.
      window.prompt("Copy your Vault link:", url);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "My Antwerp Vault",
        text: "Open my saved Antwerp finds",
        url,
      });
    } catch {
      // User dismissed the share sheet, or it's unavailable; nothing to do -> Copy link stays as the fallback.
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="send-title">
      <div>
        <p className="caption uppercase tracking-wide text-text-secondary">
          Send to another device
        </p>
        <h3 id="send-title" className="main-header text-text-main text-2xl">
          Open your Vault anywhere
        </h3>
      </div>

      <div className="flex-centered">
        <div className="bg-white p-4 rounded-sm">
          <QRCodeSVG value={url} size={220} level="M" />
        </div>
      </div>

      <p className="p-reg text-text-secondary text-center">
        Scan the code from another device, or {canShare ? "share" : "copy"} the
        link to open your Vault on a laptop. Your {count} item
        {count !== 1 ? "s" : ""}, trip dates and details come along. No login
        needed!
      </p>

      <div className="flex flex-col gap-3">
        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            className="add-button w-full justify-center px-4 h-fit py-2 cursor-pointer"
          >
            <span className="p-reg-h font-body-bold text-primary-2 whitespace-nowrap">
              Share link
            </span>
          </button>
        )}
        <div className="flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="secondary-cta cursor-pointer"
          >
            {copied ? "Link copied!" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="add-button px-4 h-fit py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="p-reg-h font-body-bold text-primary-2 whitespace-nowrap">
              Done
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

// A saved row: thumbnail + title + (shop/type) + a primary action and remove.
// Clicking the row navigates to the detail page and closes the Vault.
const SavedRow = ({ item, onOpen, onRemove, action }) => (
  <li className="flex items-center gap-3 py-4 px-5 border rounded-xs border-text-main/60">
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
    >
      <img
        src={item.image || "/assets/images/shop-photo.png"}
        alt=""
        className="w-14 h-14 object-cover rounded-xs shrink-0 border border-text-main/20"
      />
      <span className="flex flex-col min-w-0">
        <span className="p-reg-h text-text-secondary truncate mb-1">
          {item.shop ? `${item.shop} · ` : ""}
          {item.type === "shop"
            ? item.shopType
              ? item.shopType.replace(/_/g, " ")
              : "Shop"
            : "product"}
        </span>
        <span className="text-xl font-body-regular text-text-main truncate">
          {item.title}
        </span>
      </span>
    </button>
    {action}
    <button
      type="button"
      onClick={() => onRemove(item.id)}
      aria-label={`Remove ${item.title} from your Vault`}
      className="shrink-0 w-8 h-8 text-xl flex-centered pb-1 rounded-xs border border-text-main/30 text-text-secondary hover:text-text-main hover:border-text-main transition-colors cursor-pointer"
    >
      ×
    </button>
  </li>
);

// A reserved item: a card carrying the "Requested" status, the expecting-you line, and the gateway to the pickup reference (kept behind a tap to reduce clutter). There's deliberately no remove button; a reservation can only be undone through the explicit "Cancel reservation" action (in Show at shop), which confirms first, so it can't be dropped by an accidental tap.
const ReservedRow = ({ item, dates, onOpen, onShow }) => (
  <li className="rounded-xs border border-text-main/30 p-4 mb-3 flex flex-col gap-3">
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
      >
        <img
          src={item.image || "/assets/images/shop-photo.png"}
          alt=""
          className="w-14 h-14 object-cover rounded-xs shrink-0 border border-text-main/20"
        />
        <span className="flex flex-col min-w-0">
          <span className="caption text-text-secondary truncate">
            {item.shop ? `${item.shop} · ` : ""}
            {item.type === "shop"
              ? item.shopType
                ? item.shopType.replace(/_/g, " ")
                : "Shop"
              : "product"}
          </span>
          <span className="p-large-h text-text-main truncate">
            {item.title}
          </span>
        </span>
      </button>
      <span className="reserve-pill border border-text-main/20 bg-text-main/10 text-text-secondary shrink-0">
        Requested
      </span>
    </div>
    {dates && (
      <p className="p-reg text-text-secondary">
        The shop is expecting you {formatRange(dates)}.
      </p>
    )}
    <button
      type="button"
      onClick={() => onShow(item)}
      className="border border-primary-2 rounded-xs bg-primary-2/20 py-2 px-4 self-start cursor-pointer"
    >
      <span className="p-large-h text-primary-2 whitespace-nowrap">
        Reservation details{" "}
      </span>
    </button>
  </li>
);

const VaultDrawer = () => {
  const {
    savedItems,
    reservedItems,
    isOpen,
    close,
    remove,
    dates,
    setDates,
    clearDates,
    contact,
    setContact,
    reserve,
    unreserve,
    unreserveAll,
    getHandoffUrl,
    count,
  } = useVault();
  const navigate = useNavigate();

  // Which item (if any) each modal is open for.
  const [reserveItem, setReserveItem] = useState(null);
  const [showItem, setShowItem] = useState(null);
  // A pending confirmation { title, message, confirmLabel, onConfirm } or null.
  const [confirm, setConfirm] = useState(null);
  // Whether the cross-device hand-off (QR) modal is open.
  const [sendOpen, setSendOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const openItem = (item) => {
    close();
    if (item.type === "shop") {
      navigate(`/shops/${encodeURIComponent(item.shop || item.title)}`);
    } else {
      navigate(`/${item.idNr}`);
    }
  };

  const confirmReserve = ({ newDates, newContact }) => {
    // Resolve the effective dates/contact now: the just-set values won't be in this closure's `dates`/`contact` yet (setState is async), so prefer the incoming ones and fall back to what's already saved.
    const effectiveDates = newDates || dates;
    const effectiveContact = newContact || contact;
    if (newDates) setDates(newDates);
    if (newContact) setContact(newContact);
    // Flip the local reserve (the source of truth) and grab the pickup reference, then mirror the reservation to Strapi. The server write is fire-and-forget: a sleeping/unreachable CMS must not break the local reserve the visitor just made.
    const reference = reserve(reserveItem.id);
    createReservation({
      item: reserveItem,
      dates: effectiveDates,
      contact: effectiveContact,
      reference,
    });
    setReserveItem(null);
  };

  const reservedCount = reservedItems.length;

  // Trip dates are what shops hold reservations against. Widening the range so it still covers the original days keeps reservations intact (e.g. staying longer). Only when the new range no longer covers the reserved days do we make the visitor confirm — and on confirm, revert them all to Saved.
  const handleSaveDates = (next) => {
    if (reservedCount > 0 && !rangeCovers(next, dates)) {
      setConfirm({
        title: "Change your trip dates?",
        message: `Your new dates no longer cover the days you reserved for, so all ${reservedCount} reserved item${reservedCount > 1 ? "s" : ""} will be cancelled and moved back to Saved.`,
        confirmLabel: "Change & cancel",
        onConfirm: () => {
          setDates(next);
          unreserveAll();
        },
      });
    } else {
      setDates(next);
    }
  };

  const handleClearDates = () => {
    if (reservedCount > 0) {
      setConfirm({
        title: "Clear your trip dates?",
        message: `This will immediately cancel all ${reservedCount} reserved item${reservedCount > 1 ? "s" : ""} and move them back to Saved.`,
        confirmLabel: "Clear & cancel",
        onConfirm: () => {
          clearDates();
          unreserveAll();
        },
      });
    } else {
      clearDates();
    }
  };

  // Cancelling a single reservation also confirms, to guard against accidental taps. The item returns to Saved (remove from Vault is a separate action).
  const requestCancel = (item) => {
    setConfirm({
      title: "Cancel this reservation?",
      message: `${item.title} will move back to Saved. The shop won't expect you for it anymore.`,
      confirmLabel: "Cancel reservation",
      onConfirm: () => {
        unreserve(item.id);
        setShowItem(null);
      },
    });
  };

  // The per-row primary action: products open the reserve flow (the flow itself gates on dates). Shops have no row action (they aren't reservable), so the
  // card is just open + remove.
  const savedAction = (item) =>
    item.type === "shop" ? null : (
      <button
        type="button"
        onClick={() => setReserveItem(item)}
        title="Reserve for your trip"
        className="reserve-pill border-primary-1 text-primary-1 hover:bg-primary-1/10 transition-colors cursor-pointer"
      >
        RESERVE
      </button>
    );

  return (
    <>
      {/* Backdrop — only meaningful from `sm` up, where the panel is a drawer. On phones the panel is full-page, so the backdrop sits behind it. */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[15px]"
        onClick={close}
      />

      {/* Panel: full-page only on genuinely small screens (phones). From `sm` up it's a right-side drawer that scales with the viewport (60vw) but is clamped so content never stretches too wide to read comfortably. */}
      <aside
        className="fixed inset-0 z-50 flex flex-col bg-text-main/10 border-text-main/20
                   sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[60vw] sm:min-w-[480px] sm:max-w-[860px] sm:border-l"
        role="dialog"
        aria-label="Your Antwerp Vault"
      >
        <header className="flex items-start justify-between px-5 lg:px-6 pt-5">
          <button
            type="button"
            onClick={close}
            aria-label="Close Vault"
            className="ml-auto w-10 h-10 flex-centered rounded-xs pb-1 border border-text-main/30 pb-1 text-text-main hover:border-primary-2 hover:text-primary-2 transition-colors cursor-pointer text-xl"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 lg:px-6 pb-6 mt-6">
          <h2 className="leading-[80%] text-text-main text-3xl flex flex-wrap gap-y-4 items-end gap-3 mb-6 text-nowrap">
            <Vault className="w-8 md:w-10 lg:w-12 h-auto shrink-0 mr-1" />
            Your Antwerp Vault
          </h2>
          <p className="p-large text-text-main mt-1 mb-8">
            Your Vault keeps everything you save for your trip in one place.
          </p>

          <div className="mb-8">
            <TripDates
              dates={dates}
              onSave={handleSaveDates}
              onClear={handleClearDates}
            />
          </div>
          <hr className="mb-8" />
          {/* Saved items */}
          <section className="mb-8">
            <h3 className="p-large-h text-text-main mb-4">
              Saved
              <span className="text-text-secondary">· {savedItems.length}</span>
            </h3>
            {savedItems.length === 0 ? (
              <p className="p-reg text-text-secondary py-3">
                Explore the canvas and tap “Add to Vault” on anything you love.
              </p>
            ) : (
              <ul className="flex flex-col gap-y-5">
                {savedItems.map((item) => (
                  <SavedRow
                    key={item.id}
                    item={item}
                    onOpen={openItem}
                    onRemove={remove}
                    action={savedAction(item)}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Reserved items */}
          <section>
            <h3 className="p-large-h text-text-main mb-4">
              Reserved{" "}
              <span className="text-text-secondary">
                · {reservedItems.length}
              </span>
            </h3>
            {reservedItems.length === 0 ? (
              <p className="p-reg text-text-secondary py-3 ">
                {dates
                  ? "Reserve a saved item to ask the shop to hold it for your visit."
                  : "Add your Antwerp visit dates to reserve items."}
              </p>
            ) : (
              <ul className="flex flex-col">
                {reservedItems.map((item) => (
                  <ReservedRow
                    key={item.id}
                    item={item}
                    dates={dates}
                    onOpen={openItem}
                    onShow={setShowItem}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Cross-device hand-off, pinned at the foot of the drawer. */}
        <footer className="px-5 lg:px-6 py-4 border-t border-text-main/20">
          <button
            type="button"
            onClick={() => setSendOpen(true)}
            disabled={count === 0}
            title={
              count === 0
                ? "Save something first"
                : "Open your Vault on another device"
            }
            className="add-button w-full justify-center px-4 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="p-large-h text-primary-2 whitespace-nowrap flex items-center gap-2">
              <Phone />
              Send to device
            </span>
          </button>
        </footer>
      </aside>

      {reserveItem && (
        <ReserveModal
          item={reserveItem}
          dates={dates}
          contact={contact}
          onClose={() => setReserveItem(null)}
          onConfirm={confirmReserve}
        />
      )}
      {showItem && (
        <ShowAtShopModal
          item={showItem}
          dates={dates}
          onClose={() => setShowItem(null)}
          onCancel={() => requestCancel(showItem)}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
          onClose={() => setConfirm(null)}
        />
      )}
      {sendOpen && (
        <SendToPhoneModal
          url={getHandoffUrl()}
          count={count}
          onClose={() => setSendOpen(false)}
        />
      )}
    </>
  );
};

// Small inline map-pin icon for the shop directions link, kept local.
const MapPinIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default VaultDrawer;
