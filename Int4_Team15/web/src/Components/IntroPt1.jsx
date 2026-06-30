import { useRef } from "react";
import IntroButton from "./IntroButton";
import Logo from "./jsx-assets/Logo";
import ProgressDots from "./ProgressDots";
import { SplitText } from "gsap/all";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(SplitText);

const IntroPt1 = ({ onClick, part, setIsIntro }) => {
  const headerRef = useRef(null);
  const paragraphRef = useRef(null);
  const headingRef = useRef(null);

  const logoMobileRef = useRef(null);
  const logoDesktopRef = useRef(null);
  const skipBtnRef = useRef(null);
  const controlsRef = useRef(null);

  useGSAP(() => {
    SplitText.create(headerRef.current, {
      type: "words, lines",
      // mask: "lines",
      autoSplit: true,
      onSplit(self) {
        gsap.from(self.lines, {
          xPercent: 100,
          opacity: 0,
          duration: 1.2,
          stagger: 0.1,
          ease: "power2.out",
        });
      },
    });

    SplitText.create(paragraphRef.current, {
      type: "words, lines",
      autoSplit: true,
      onSplit(self) {
        gsap.from(self.lines, {
          xPercent: -100,
          opacity: 0,
          duration: 1.2,
          ease: "power2.out",
          stagger: 0.05,
        });
      },
    });

    SplitText.create(headingRef.current, {
      type: "words, lines",
      autoSplit: true,
      onSplit(self) {
        gsap.from(self.lines, {
          xPercent: -100,
          duration: 1.2,
          opacity: 0,
          ease: "power2.out",
          stagger: 0.05,
          delay: 0.1,
        });
      },
    });

    gsap.from(
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
    );
  }, []);

  return (
    <section className="w-full h-full flex flex-col justify-between px-5 py-6 md:px-8 md:py-10">
      <div className="flex justify-between items-start w-full">
        <div ref={logoMobileRef} className="md:hidden">
          <Logo />
        </div>
        <h1
          ref={headerRef}
          className="mt-16 md:mt-0 text-center md:text-left md:max-w-[50%] lg:max-w-xl text-text-main bg-accentbg py-4 pl-4 rounded-full"
        >
          Antwerp has many
          <span className="flex flex-col md:w-fit items-center md:items-start pixel">
            <span className="mb-1.5">facets.</span>
            <span className="hidden md:block rotate-180 text-primary-2">
              facets
            </span>
            <span className="hidden md:block [-webkit-text-stroke:1px_var(--color-text-main)] text-accentbg rotate-180">
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

        <article className="max-w-120 lg:-mr-20 xl:mr-0 lg:max-w-170 bg-accentbg px-4 pt-4 grow-0 flex flex-col items-center md:items-start">
          <p
            ref={paragraphRef}
            className="text-text-main p-large md:w-2/3 mb-4 md:mb-6 text-center md:text-start"
          >
            Let real, local creatives guide you through the ones that shine for
            you.
          </p>
          <h4 ref={headingRef}>
            <span className="[text-shadow:-0.8px_-0.8px_0_var(--color-text-main),0.8px_-0.8px_0_var(--color-text-main),-0.8px_0.8px_0_var(--color-text-main),0.8px_0.8px_0_var(--color-text-main)]">
              Make your visit authentically yours at{" "}
            </span>
            <span className="[text-shadow:-0.8px_-0.8px_0_var(--color-primary-2),0.8px_-0.8px_0_var(--color-primary-2),-0.8px_0.8px_0_var(--color-primary-2),0.8px_0.8px_0_var(--color-primary-2)]">
              Kar.at.
            </span>
          </h4>
        </article>

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
