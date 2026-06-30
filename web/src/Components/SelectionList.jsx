const SelectionList = ({ options, selectedStyles, handleToggle }) => {
  return (
    <ul className="flex flex-wrap justify-center lg:justify-start gap-x-5 xl:gap-x-8 gap-y-4 xl:gap-y-10 py-6 md:py-14 border-y border-text-intro2/30 mb-12">
      {options.map((option) => {
        const isSelected = selectedStyles.includes(option);
        const isAtLimit = selectedStyles.length >= 3;
        const isDisabled = !isSelected && isAtLimit;

        return (
          <li
            key={option}
            onClick={() => !isDisabled && handleToggle(option)}
            className={`
                  px-6 py-3 w-fit border-[1.5px] border-primary-1 rounded-sm select-none transition-colors p-reg-h font-body-bold md:p-large-h md:font-body-bold uppercase flex-centered gap-2 
                  ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                  ${
                    isSelected
                      ? "bg-primary-1 text-accentbg"
                      : "bg-transparent text-primary-1 hover:bg-primary-1/10"
                  }
                `}
          >
            <span
              className={`inline-block w-3 h-3 border-2 transition-all ease-out duration-200 ${isSelected ? "border-accent-bg bg-primary-1 rotate-0" : "border-primary-1 bg-accentbg rotate-45"}`}
            ></span>
            {option}
          </li>
        );
      })}
    </ul>
  );
};

export default SelectionList;
