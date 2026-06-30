import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/*** Onboarding step 3: choose your guide. *** 

Controlled by IntroMain: it receives the curators matching the picked subcultures, the selected slug, and an onSelect callback. 

It features horizontal side-scrolling via GSAP. ***/
const CreativeSelect = ({ curators = [], selectedSlug, onSelect }) => {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  // True right after a real drag, so the pointer-up doesn't also select a card.
  const justDraggedRef = useRef(false);

  useGSAP(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    let targetX = 0;
    const maxScroll = () => track.scrollWidth - container.clientWidth;

    const xTo = gsap.quickTo(track, "x", {
      duration: 0.5,
      ease: "power3.out",
    });

    const scrollBy = (delta) => {
      if (maxScroll() <= 0) return;
      targetX = gsap.utils.clamp(-maxScroll(), 0, targetX - delta);
      xTo(targetX);
    };

    // Wheel: honour whichever axis the device sends (trackpads send deltaX).
    const handleWheel = (e) => {
      if (maxScroll() <= 0) return;
      e.preventDefault();
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      scrollBy(delta);
    };

    /*** Pointer drag (mouse + touch) so the carousel works without a scroll wheel.*** 
    Crucially we DON'T capture the pointer on press; only once movement passes a small threshold. Capturing on press redirects the pointerup/click to the container, which swallowed clicks on the cards' +/- buttons and made cards nearly impossible to select while the row was scrollable! ***/
    let pressing = false;
    let dragging = false;
    let startX = 0;
    let lastX = 0;
    const onPointerDown = (e) => {
      pressing = true;
      dragging = false;
      startX = e.clientX;
      lastX = e.clientX;
      justDraggedRef.current = false;
    };
    const onPointerMove = (e) => {
      if (!pressing) return;
      if (!dragging) {
        if (Math.abs(e.clientX - startX) <= 6) return; // still a click, not a drag
        dragging = true;
        justDraggedRef.current = true;
        if (maxScroll() > 0) container.setPointerCapture?.(e.pointerId);
      }
      scrollBy(lastX - e.clientX); // drag right → content moves right
      lastX = e.clientX;
    };
    const endDrag = (e) => {
      if (!pressing) return;
      pressing = false;
      if (dragging) {
        container.releasePointerCapture?.(e.pointerId);
        // Let the imminent click see justDragged, then clear it.
        setTimeout(() => (justDraggedRef.current = false), 50);
      }
      dragging = false;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", endDrag);
      container.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  return (
    <section className="w-full flex items-center justify-center py-4 h-full">
      <div
        ref={containerRef}
        className="w-full max-w-[100vw] overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          touchAction: "pan-y",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        {/* The GSAP Animated Track */}
        <div
          ref={trackRef}
          className="flex gap-4 w-max items-center px-10 py-4"
        >
          {curators.map((curator) => (
            <div key={curator.slug} className="shrink-0">
              <CreativeCard
                curator={curator}
                isSelected={curator.slug === selectedSlug}
                onClick={() => {
                  if (justDraggedRef.current) return; // ignore drag-release
                  onSelect(curator.slug === selectedSlug ? null : curator.slug);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CreativeSelect;

const CreativeActionButton = ({ isSelected }) => {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label="Select guide"
      className="absolute right-2 top-5 z-10 cursor-pointer hover:scale-105 transition-transform"
    >
      <div
        className={
          "w-11 h-11 bg-accentbg rounded-sm absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        }
      />
      <div
        className={`w-8 h-8 border flex items-center justify-center rounded-sm  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all ${isSelected ? "border-primary-1 bg-primary-1" : "bg-accentbg border-text-intro1"}`}
      >
        {isSelected ? (
          <Minus isSelected={isSelected} />
        ) : (
          <Plus isSelected={isSelected} />
        )}
      </div>
    </button>
  );
};

const CreativeCard = ({ curator, isSelected, onClick }) => {
  return (
    <article
      onClick={onClick}
      className={`flex flex-col items-center w-56 h-82 px-2 py-4 gap-4 overflow-hidden select-none border rounded-sm transition-all ${isSelected ? "border-primary-1" : "border-transparent hover:border-text-intro2/40"}`}
    >
      <div
        className={`w-[67%] shrink-0 h-auto aspect-square rounded-full relative transition-all ${isSelected && "p-1 bg-primary-1"}`}
      >
        <CreativeActionButton isSelected={isSelected} />
        <img
          className={`w-full h-full object-cover rounded-full pointer-events-none transition-all ${isSelected && "border-4 border-accentbg"}`}
          src={curator.avatar || "/assets/images/image-detail3.png"}
          alt={curator.name}
        />
      </div>

      <div className="flex shrink-0 mt-2 gap-2">
        <div
          className={`tag-display text-nowrap caption border uppercase ${!isSelected ? "bg-accentbg border border-text-secondary text-text-main" : "bg-primary-1/20 border-primary-1 text-primary-1"}`}
        >
          {curator.subculture}
        </div>
      </div>

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <p className="p-large-h font-body-bold text-text-main text-center mb-2 shrink-0">
          {curator.name}
        </p>
        <p className="p-reg text-center text-text-secondary line-clamp-3 overflow-hidden text-ellipsis">
          {curator.tone}
        </p>
      </div>
    </article>
  );
};

export const Plus = ({ isSelected }) => {
  return (
    <svg
      width="18"
      height="17"
      viewBox="0 0 18 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.25 6.21973V9.96973L0 9.96973L1.63916e-07 6.21973L17.25 6.21973Z"
        fill={
          !isSelected ? "var(--color-text-main)" : "var(--color-accentbg)"
        }
      />
      <path
        d="M6.75 0H10.5V17H6.75V0Z"
        fill={
          !isSelected ? "var(--color-text-main)" : "var(--color-accentbg)"
        }
      />
    </svg>
  );
};

export const Minus = ({ isSelected }) => {
  return (
    <svg
      width="18"
      height="17"
      viewBox="0 0 18 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.25 6.21973V9.96973L0 9.96973L1.63916e-07 6.21973L17.25 6.21973Z"
        fill={
          !isSelected ? "var(--color-text-main)" : "var(--color-accentbg)"
        }
      />
    </svg>
  );
};
