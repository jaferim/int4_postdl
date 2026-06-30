import { useState } from "react";
import Logo from "./jsx-assets/Logo";
import ProgressDots from "./ProgressDots";
import IntroButton from "./IntroButton";
import SelectionList from "./SelectionList";
import CreativeSelect from "./CreativeSelect";
import { CURATORS, curatorsForStyles } from "../lib/curators.js";
import { useCurator } from "../lib/curator-context.js";

// The onboarding styles are the curators' subcultures (1:1), so picking styles narrows to the curators who specialise in them on the next step.
const options = CURATORS.map((c) => c.subculture);

const introContent = {
  2: {
    title: "What style suits you best?",
    description:
      "Pick two or three and build your canvas around them. You can wander beyond them later.",
  },
  3: {
    title: "Who’s showing you around?",
    description:
      "Real creatives with authentic Antwerp picks. Pick your guide!",
  },
};

const randomSlug = (list) =>
  list.length ? list[Math.floor(Math.random() * list.length)].slug : undefined;

const IntroMain = ({
  onClick,
  part,
  setIsIntro,
  selectedCurator,
  setSelectedCurator,
}) => {
  const { setActiveCurator } = useCurator();
  const [selectedStyles, setSelectedStyles] = useState([]);

  const handleToggle = (option) => {
    if (selectedStyles.includes(option)) {
      setSelectedStyles(selectedStyles.filter((item) => item !== option));
    } else if (selectedStyles.length < 3) {
      setSelectedStyles([...selectedStyles, option]);
    }
  };

  // Curators specialising in the chosen styles (all of them if nothing picked).
  const guides = selectedStyles.length
    ? curatorsForStyles(selectedStyles)
    : CURATORS;

  // Commit the chosen guide as the active curator (themes the site + centres the homepage on their moodboard) and advance/finish the intro.
  const finishWith = (slug) => {
    if (slug) setActiveCurator(slug);
    onClick();
  };

  const { title, description } = introContent[part];

  return (
    <section className="w-full h-full px-3 py-6 md:px-8 md:py-10">
      <div className="flex justify-between items-start w-full">
        <div>
          <Logo />
        </div>
        <button
          className="p-large-h text-text-main underline font-body-bold text-nowrap pointer-events-auto cursor-pointer"
          onClick={() => setIsIntro(false)}
        >
          Skip intro
        </button>
      </div>
      <section className="lg:max-w-[60%] xl:max-w-1/2 flex flex-col justify-between h-full pb-10">
        <header className="mt-10">
          <h2 className="mb-5 text-center lg:text-left font-display-pixel text-text-main">
            {title}
          </h2>
          <h5 className="text-center lg:text-left p-large md:h5-subhead lg:w-[70%] text-text-secondary">
            {description}
          </h5>
        </header>
        <div className="pointer-events-auto h-full flex flex-col justify-end">
          {part === 2 ? (
            <SelectionList
              options={options}
              selectedStyles={selectedStyles}
              handleToggle={handleToggle}
            />
          ) : (
            <CreativeSelect
              curators={guides}
              selectedSlug={selectedCurator}
              onSelect={setSelectedCurator}
            />
          )}
          <div className="flex flex-row-reverse flex-wrap gap-4 justify-center sm:justify-between items-center">
            <ProgressDots part={part} />
            <div className="flex gap-5">
              {part === 2 ? (
                <IntroButton content="Continue" onClick={onClick} />
              ) : (
                <>
                  <IntroButton
                    content="Let's go!"
                    onClick={() =>
                      finishWith(selectedCurator || guides[0]?.slug)
                    }
                  />
                  <IntroButton
                    secondary
                    content="Let us pick for you"
                    onClick={() => finishWith(randomSlug(guides))}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
};

export default IntroMain;
