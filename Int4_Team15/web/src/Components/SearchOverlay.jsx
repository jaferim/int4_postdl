import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  buildIndex,
  searchIndex,
  matchedTags,
  popularTags,
} from "../lib/search.js";
import SearchPixel from "./jsx-assets/SearchPixel.jsx";

// What each result kind is called in the UI (the data `type` isn't user-facing).
const KIND_LABEL = { item: "Item", shop: "Shop", curator: "Curator" };

const FALLBACK_IMG = "/assets/images/shop-photo.png";

// One result row: thumbnail, title, kind + subtitle, and any tags that matched the query. The whole row navigates. `active` is the keyboard-highlighted row.
const ResultRow = ({ entry, query, active, onSelect, rowRef }) => {
  const tags = matchedTags(entry, query);
  return (
    <li>
      <button
        ref={rowRef}
        type="button"
        onClick={() => onSelect(entry)}
        className={`w-full flex items-center gap-3 py-3 px-3 rounded-xs text-left cursor-pointer transition-colors ${
          active ? "bg-text-main/15" : "hover:bg-text-main/10"
        }`}
      >
        <img
          src={entry.image || FALLBACK_IMG}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMG;
          }}
          className="w-12 h-12 object-cover rounded-xs shrink-0 border border-text-main/20 radial-mask"
        />
        <span className="flex flex-col min-w-0 flex-1 gap-1">
          <span className="p-reg-h text-text-main truncate">
            {entry.title}
          </span>
          <span className="caption text-text-secondary truncate">
            {KIND_LABEL[entry.kind]}
            {entry.subtitle ? ` · ${entry.subtitle}` : ""}
          </span>
        </span>
        {tags.length > 0 && (
          <span className="hidden sm:flex gap-1.5 shrink-0">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag-wrapper bg-text-main">
                <span className="tag-display capitalize text-nowrap text-text-main/80">{tag}</span>
              </span>
            ))}
          </span>
        )}
      </button>
    </li>
  );
};

// Full-screen search palette. Opened from the nav; closes on Escape, on the backdrop, or after picking a result. Search is client-side over the graph (see lib/search.js) so it's instant and works the same in seed or API mode.
const SearchOverlay = ({ nodes = [], curators = [], onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const activeRowRef = useRef(null);

  const index = useMemo(
    () => buildIndex(nodes, curators),
    [nodes, curators],
  );
  const results = useMemo(() => searchIndex(index, query), [index, query]);
  const tags = useMemo(() => popularTags(index), [index]);

  // Focus the input the moment the palette opens so you can just type.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // Typing (or tapping a tag) changes the query and snaps the keyboard cursor back to the first result, so it never points past a shrunken result set.
  const updateQuery = (value) => {
    setQuery(value);
    setActive(0);
  };

  const select = (entry) => {
    onClose();
    navigate(entry.to);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      select(results[active]);
    }
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-60 flex justify-center p-4 sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[12px]"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-xl h-fit max-h-full sm:max-h-[70vh] flex flex-col bg-accentbg/50 border border-text-main/20 rounded-sm overflow-hidden"
        onKeyDown={onKeyDown}
      >
        {/* Search field */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-text-main/15">
          <SearchPixel className="w-5 h-5 text-text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Search items, shops, curators, tags..."
            aria-label="Search query"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="flex-1 min-w-0 bg-transparent text-text-main p-large placeholder:text-text-secondary/70 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 w-8 h-8 text-xl flex-centered rounded-xs border border-text-main/30 pb-1 text-text-secondary hover:text-text-main hover:border-text-main transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {!hasQuery ? (
            <div className="px-2 py-3">
              <p className="caption uppercase tracking-wide text-text-secondary mb-3">
                Popular tags
              </p>
              <div className="flex flex-wrap gap-x-2 gap-y-4">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      updateQuery(tag);
                      inputRef.current?.focus();
                    }}
                    className="tag-wrapper cursor-pointer bg-text-secondary"
                  >
                    <span className="tag-display capitalize text-nowrap p-reg-h text-text-secondary">
                      {tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <p className="p-reg text-text-secondary text-center py-10 px-4">
              No matches for “{query.trim()}”. Try a different word or a tag.
            </p>
          ) : (
            <>
              <p className="caption text-text-secondary px-3 pt-1 pb-2">
                {results.length} result{results.length === 1 ? "" : "s"}
              </p>
              <ul className="flex flex-col">
                {results.map((entry, i) => (
                  <ResultRow
                    key={entry.key}
                    entry={entry}
                    query={query}
                    active={i === active}
                    onSelect={select}
                    rowRef={i === active ? activeRowRef : null}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
