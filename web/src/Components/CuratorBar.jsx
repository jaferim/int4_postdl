import { useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
import { useCurator } from "../lib/curator-context.js";
import gsap from "gsap";

const CuratorBar = () => {
  const { curators, activeSlug, setActiveCurator } = useCurator();
  // const navigate = useNavigate();
  const activeRef = useRef(null);

  // Refs for logic
  const mainContainer = useRef(null);
  const railRef = useRef(null);
  const rulerRef = useRef(null);
  const lastScrollY = useRef(0);

  // 1. Center the active chip on mount or active change
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeSlug]);

  // 2. Hide/Show bar on vertical window scroll
  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleWindowScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY.current) {
        gsap.to(mainContainer.current, {
          yPercent: 0,
          duration: 1,
          ease: "power2.out",
          overwrite: "auto",
        });
      } else if (currentScrollY > lastScrollY.current) {
        gsap.to(mainContainer.current, {
          yPercent: 100,
          duration: 1,
          ease: "power2.out",
          overwrite: "auto",
        });
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
    };
  }, []);

  // 3. Smooth horizontal wheel scroll for the rail
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    let targetScroll = rail.scrollLeft;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();

        if (!gsap.isTweening(rail)) {
          targetScroll = rail.scrollLeft;
        }

        const maxScroll = rail.scrollWidth - rail.clientWidth;

        targetScroll += e.deltaY;
        targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

        gsap.to(rail, {
          scrollLeft: targetScroll,
          duration: 0.5,
          ease: "power2.out",
          overwrite: "auto",
        });
      } else {
        targetScroll = rail.scrollLeft;
      }
    };

    rail.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      rail.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // 4. Update Ruler Progress directly from rail scroll
  const handleRailScroll = () => {
    if (!railRef.current || !rulerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = railRef.current;
    const maxScroll = scrollWidth - clientWidth;

    // Prevent division by zero if content isn't scrollable yet
    const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;

    // Update the CSS variable directly for maximum performance
    rulerRef.current.style.setProperty("--progress", progress);
  };

  const select = (slug) => {
    setActiveCurator(slug);
    // navigate("/");
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none pt-16"
      ref={mainContainer}
    >
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)",
        }}
        aria-hidden="true"
      />
      <div className="flex flex-col items-center gap-2 max-w-full">
        {/* Attach the new rulerRef here */}
        <div ref={rulerRef} className="curator-ruler" aria-hidden="true" />
        <div
          ref={railRef}
          className="curator-rail py-2 pointer-events-auto"
          role="tablist"
          aria-label="Curators"
          onScroll={handleRailScroll} // Track the scroll position
        >
          {curators.map((c) => {
            const active = c.slug === activeSlug;
            return (
              <button
                key={c.slug}
                ref={active ? activeRef : null}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => select(c.slug)}
                className={`curator-chip ${active ? "curator-chip-active" : ""}`}
              >
                <div
                  className={`w-12 h-12 rounded-full ${!active ? "border border-text-main" : "bg-primary-1 p-0.5"}`}
                >
                  <img
                    className={`w-full h-auto rounded-full transition-all duration-300 ${!active ? "opacity-0 " : "border-2 border-normalbg"}`}
                    src={c.avatar}
                    alt=""
                  />
                </div>
                <span className="flex flex-col items-start gap-1">
                  <span className="p-large-h whitespace-nowrap">{c.name}</span>
                  <span className="caption whitespace-nowrap opacity-70">
                    {c.subculture}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CuratorBar;
