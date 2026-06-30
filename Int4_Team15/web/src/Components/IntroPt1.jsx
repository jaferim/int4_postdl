import { useRef } from "react";
import IntroButton from "./IntroButton";
import Logo from "./jsx-assets/Logo";
import ProgressDots from "./ProgressDots";
import { SplitText } from "gsap/all";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(SplitText);

const IntroPt1 = ({ onClick, part, setIsIntro }) => {
  const headerRef1 = useRef(null);
  const headerRef2 = useRef(null);

  const paragraphRef = useRef(null);

  const logoMobileRef = useRef(null);
  const logoDesktopRef = useRef(null);
  const skipBtnRef = useRef(null);
  const controlsRef = useRef(null);

  const firstFacet = useRef();
  const secondFacet = useRef();

  useGSAP(() => {
    const windowHeight = window.innerHeight;
    const halfPlusQuarter = windowHeight / 2 + windowHeight / 4;

    gsap.set([firstFacet.current, secondFacet.current], {
      rotateX: 90,
      transformOrigin: "bottom center",
      yPercent: -100,
    });

    let isTextVisible = false;
    let isSecondTextVisible = false;

    const handleMousePos = (e) => {
      if (e.clientY > windowHeight / 2 && !isTextVisible) {
        isTextVisible = true;
        gsap.to(firstFacet.current, {
          rotateX: 0,
          duration: 0.8,
          ease: "bounce.out",
        });
      }
      if (e.clientY < windowHeight / 2 && isTextVisible) {
        isTextVisible = false;
        gsap.to(firstFacet.current, {
          rotateX: 90,
          duration: 0.8,
          ease: "power2.in",
        });
      }
      if (e.clientY > halfPlusQuarter && !isSecondTextVisible) {
        isSecondTextVisible = true;
        gsap.to(secondFacet.current, {
          rotateX: 0,
          duration: 0.8,
          ease: "bounce.out",
        });
      }
      if (e.clientY < halfPlusQuarter && isSecondTextVisible) {
        isSecondTextVisible = false;
        gsap.to(secondFacet.current, {
          rotateX: 90,
          duration: 0.8,
          ease: "power2.in",
        });
      }
    };
    const headerSplit = new SplitText(headerRef1.current, {
      type: "words, lines",
    });
    const headerSplit2 = new SplitText(headerRef2.current, {
      type: "words, lines",
    });

    const tl = gsap.timeline({
      onComplete: () => {
        console.log("complete");
        window.addEventListener("mousemove", handleMousePos);
      },
    });

    tl.from(headerSplit.lines, {
      xPercent: 100,
      duration: 1.2,
      opacity: 0,
      ease: "power2.out",
    })
      .from(
        headerSplit2.lines,
        {
          xPercent: 100,
          duration: 1.2,
          opacity: 0,
          ease: "power2.out",
        },
        "-=1.1",
      )
      .from(
        [
          logoMobileRef.current,
          logoDesktopRef.current,
          skipBtnRef.current,
          controlsRef.current,
        ],
        {
          scale: 0,
          opacity: 0,
          duration: 0.8,
          ease: "back.out(1.5)",
          stagger: 0.1,
          delay: 0.2,
        },
        "-=0.4",
      );

    return () => {
      window.removeEventListener("mousemove", handleMousePos);
    };
  }, []);

  return (
    <section className="w-full h-full flex flex-col justify-between px-5 py-6 md:px-8 md:py-10">
      <div className="flex justify-between items-start w-full">
        <div ref={logoMobileRef} className="md:hidden">
          <Logo />
        </div>
        <h1 className="mt-16 md:mt-0 text-center md:text-left md:max-w-[50%] lg:max-w-xl text-text-main bg-accentbg py-4 pl-4 rounded-full">
          <span ref={headerRef1}>Antwerp has many</span>
          <span className="flex flex-col md:w-fit items-center md:items-start pixel">
            <span ref={headerRef2} className="mb-1.5">
              facets.
            </span>
            <span ref={firstFacet} className="rotate-180 text-primary-2">
              facets
            </span>
            <span
              ref={secondFacet}
              className="[-webkit-text-stroke:1px_var(--color-text-main)] text-accentbg rotate-180"
            >
              facets
            </span>
          </span>
        </h1>
        <button
          ref={skipBtnRef}
          className="p-large-h text-text-main underline font-body-bold text-nowrap pointer-events-auto cursor-pointer"
          onClick={() => setIsIntro(false)}
        >
          Skip intro
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center md:justify-between gap-12 md:items-end w-full">
        <div ref={logoDesktopRef} className="hidden md:block">
          <Logo />
        </div>

        {/* <article> */}
        <p
          ref={paragraphRef}
          className="text-text-main text-xl w-[40%] font-body-regular text-center md:text-end p-4 bg-accentbg"
        >
          Let real, local creatives guide you through the ones that shine for
          you. Make your visit authentically yours at{" "}
          <span className="text-primary-2 font-body-bold">Kar.at.</span>
        </p>

        <div
          ref={controlsRef}
          className="flex justify-between items-center md:hidden w-full pointer-events-auto"
        >
          <IntroButton onClick={onClick} />
          <ProgressDots part={part} />
        </div>
      </div>
    </section>
  );
};

export default IntroPt1;
