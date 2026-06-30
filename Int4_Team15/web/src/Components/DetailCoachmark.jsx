import { useEffect, useState } from "react";
import PixelArrow from "./jsx-assets/PixelArrow";

/*** First-visit hints for the item detail page, where two interactions aren't obvious: 
 (1) scroll to zoom out and reveal the related rings, and 
 (2) drag sideways to spin the counter-rotating rings (surfacing facets hidden at the top/bottom).

The scroll hint stays until the rings are actually visible (`ringsVisible`, driven by ItemDetail's zoom-out), only then does the drag hint appear. 
Each clears once done; once both are (or you dismiss), it's remembered. ***/
const STORAGE_KEY = "karat-detail-coachmark-dismissed";

const DetailCoachmark = ({ ringsVisible = false }) => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [dragged, setDragged] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // A horizontal drag on the canvas spins the rings
  useEffect(() => {
    let down = false;
    let startX = 0;
    let onCanvas = false;
    const pd = (e) => {
      down = true;
      startX = e.clientX;
      onCanvas = e.target?.tagName === "CANVAS";
    };
    const pm = (e) => {
      if (down && onCanvas && Math.abs(e.clientX - startX) > 40)
        setDragged(true);
    };
    const pu = () => {
      down = false;
    };
    window.addEventListener("pointerdown", pd);
    window.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    return () => {
      window.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
    };
  }, []);

  const remember = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* storage disabled — dismiss for this session only */
    }
  };

  // Both interactions discovered: remember and retire the coachmark.
  useEffect(() => {
    if (ringsVisible && dragged && !dismissed) {
      remember();
      const t = setTimeout(() => setDismissed(true), 500);
      return () => clearTimeout(t);
    }
  }, [ringsVisible, dragged, dismissed]);

  if (dismissed) return null;
  const phase = !ringsVisible ? "scroll" : !dragged ? "drag" : null;
  if (!phase) return null;

  const dismiss = () => {
    setDismissed(true);
    remember();
  };

  return (
    <div className="fixed bottom-30 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-sm border-[0.4px] border-text-secondary/60 bg-normalbg/40 backdrop-blur-sm text-text-secondary">
        {phase === "scroll" ? (
          <>
            <div className="animate-bounce">
              <PixelArrow
                className="w-5 h-3 rotate-90"
                fill="var(--color-text-secondary)"
              />
            </div>
            <p className="p-reg-h text-nowrap">
              Scroll to explore related items &amp; shops
            </p>
          </>
        ) : (
          <>
            <span className="text-lg leading-none animate-pulse pb-2">⇆</span>
            <p className="p-reg-h text-nowrap">
              {isMobile
                ? "Drag sideways to browse"
                : "Drag sideways to spin the rings"}
            </p>
          </>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss tip"
          className="ml-1 h-6 w-6 flex-centered rounded-xs text-text-secondary hover:text-text-main hover:-rotate-6 transition-all duration-300 cursor-pointer"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default DetailCoachmark;
