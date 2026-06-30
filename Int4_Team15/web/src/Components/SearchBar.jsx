import SearchPixel from "./jsx-assets/SearchPixel.jsx";

/*** Desktop search affordance: a centered bar (not just an icon) because people scan the top-centre for a search field *** 

IMPORTANT 2 REMEMBER: it's a button, not a real input! Clicking opens the search overlay, which has the actual text field & results. ***/
const SearchBar = ({ onClick, isOpen }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Search"
      aria-expanded={isOpen}
      className="w-full h-10 flex items-center gap-2.5 px-3 rounded-xs border-[0.8px] border-text-secondary bg-text-main/5 backdrop-blur-2xl text-text-secondary cursor-pointer hover:bg-text-main/25 hover:text-text-main transition-all group"
    >
      <SearchPixel className="w-4 h-4 shrink-0 group-hover:-rotate-10 transition-all" />
      <span className="p-reg-h truncate min-w-0">
        Search items, shops, curators...
      </span>
      <span className="ml-auto p-reg-h text-text-secondary/60 hidden xl:inline">
        ⌘K
      </span>
    </button>
  );
};

export default SearchBar;
