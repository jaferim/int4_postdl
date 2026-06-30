import { useRef, useEffect } from "react";
import PixelArrow from "./jsx-assets/PixelArrow";
import gsap from "gsap";

const IntroButton = ({
  onClick,
  content = "Start exploring",
  secondary = false,
}) => {
  const arrow1 = useRef(null);
  const arrow2 = useRef(null);
  const tlRef = useRef(null);

  useEffect(() => {
    if (secondary || !arrow1.current || !arrow2.current) return;

    const ctx = gsap.context(() => {
      const inner1 = arrow1.current.children[0];
      const inner2 = arrow2.current.children[0];

      gsap.set(arrow2.current, { width: 0, opacity: 0 });
      gsap.set(inner2, { rotation: -10 });

      tlRef.current = gsap
        .timeline({ paused: true })
        .to(
          arrow1.current,
          { width: 0, opacity: 0, duration: 0.4, ease: "power2.inOut" },
          0,
        )
        .to(inner1, { rotation: -10, duration: 0.4, ease: "power2.inOut" }, 0)
        .to(
          arrow2.current,
          { width: "auto", opacity: 1, duration: 0.4, ease: "power2.inOut" },
          0,
        )
        .to(inner2, { rotation: 0, duration: 0.4, ease: "power2.inOut" }, 0);
    });

    return () => ctx.revert();
  }, [secondary]);

  const handleMouseEnter = () => {
    if (!secondary && tlRef.current) tlRef.current.play();
  };

  const handleMouseLeave = () => {
    if (!secondary && tlRef.current) tlRef.current.reverse();
  };

  return (
    <button
      className="flex items-center h-10 lg:h-12 cursor-pointer"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!secondary && (
        <div
          ref={arrow1}
          className="overflow-hidden flex h-full items-center justify-center"
        >
          <div className="border-2 border-primary-2 h-full aspect-square flex-centered rounded-xs shrink-0">
            <PixelArrow className="w-5 h-4" fill="var(--color-primary-2)" />
          </div>
        </div>
      )}

      <div
        // Added mx-1 here to replace the gap-1 spacing
        className={`h-full whitespace-nowrap mx-1 w-fit flex-centered px-6 lg:px-8 p-large font-body-bold rounded-xs ${
          !secondary
            ? "bg-primary-2 text-accent-bg"
            : "bg-accent-bg text-text-secondary border-2 border-text-secondary"
        }`}
      >
        {content}
      </div>

      {!secondary && (
        <div
          ref={arrow2}
          className="overflow-hidden flex h-full items-center justify-center"
        >
          <div className="border-2 border-primary-2 h-full aspect-square flex-centered rounded-xs shrink-0">
            <PixelArrow className="w-5 h-4" fill="var(--color-primary-2)" />
          </div>
        </div>
      )}
    </button>
  );
};

export default IntroButton;
