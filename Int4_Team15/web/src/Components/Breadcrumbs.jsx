import { useState } from "react";
import { useLocation } from "react-router-dom";
import Info from "./jsx-assets/Info";
import BaseArrow from "./jsx-assets/BaseArrow";

// Helper "coachmarks" for first-time visitors — a small cycling hint shown on the canvas. The arrow advances to the next tip; the × dismisses the whole set.
// Once dismissed it stays gone (persisted), so returning visitors aren't nagged.
const TIPS = [
  "Drag to pan around the canvas",
  "Scroll (or use +/- buttons) to zoom in and out",
  "Hover over a facet (image) to see more",
  "Click a facet to see its detail page",
  "Switch curators on the bar below",
];

const STORAGE_KEY = "karat-coachmarks-dismissed";

const Breadcrumbs = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [index, setIndex] = useState(0);

  const setPersisted = (value) => {
    setCollapsed(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* storage disabled: still collapse/expand for this session */
    }
  };
  const collapse = () => setPersisted(true);
  const expand = () => setPersisted(false);

  // Tapping the pill cycles the tips (wrapping around); the x collapses it.
  const next = () => setIndex((i) => (i + 1) % TIPS.length);

  // The tips are canvas gestures, so only surface them on the home canvas.
  if (location.pathname !== "/") return null;

  // Collapsed: a small help icon parked in the bottom-left corner, level with the lower zoom button on the opposite side, so the two balance the screen. Sized and styled like the zoom buttons so it reads as part of the same control set.
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={expand}
        aria-label="Show tips"
        className="fixed z-30 left-4 lg:left-10 bottom-30 w-10 h-10 flex-centered rounded-xs border-[0.4px] border-text-secondary/60 text-text-secondary bg-normalbg/30 backdrop-blur-sm cursor-pointer hover:border-text-main hover:text-text-main transition-all duration-300 ease-out group"
      >
        <Info />
      </button>
    );
  }

  // Expanded: the tip pill opens from that same bottom-left corner, growing rightward. The WHOLE pill advances on tap, and the × (sitting back in the corner where the icon was) collapses it to the help icon.
  return (
    <div className="fixed z-30 left-4 lg:left-10 bottom-30 flex gap-2 items-center max-w-[calc(100vw-2rem)]">
      <button
        type="button"
        onClick={collapse}
        aria-label="Collapse tips"
        className="shrink-0 w-10 h-10 flex-centered border-[0.4px] border-text-secondary/60 rounded-xs cursor-pointer text-xl leading-none pb-0.5 text-text-secondary bg-normalbg/30 backdrop-blur-sm hover:border-text-main hover:text-text-main transition-all duration-300 ease-out"
      >
        ×
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next tip"
        className="flex gap-2 cursor-pointer items-center group px-3 h-10 border-[0.4px] rounded-xs border-text-secondary/60 bg-normalbg/30 backdrop-blur-sm transition-all duration-400 ease-out text-left"
      >
        <p className="p-reg-h text-text-secondary lg:text-nowrap relative z-100">
          {TIPS[index]}
        </p>
        <span className="caption text-text-secondary/60 pl-1 shrink-0">
          {index + 1}/{TIPS.length}
        </span>
        <BaseArrow
          className="hidden lg:block w-4 h-4 group-hover:translate-x-1 transition-all duration-300 ease-out shrink-0"
          empty={true}
        />
      </button>
    </div>
  );
};

export default Breadcrumbs;
