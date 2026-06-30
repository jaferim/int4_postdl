import SearchPixel from "./jsx-assets/SearchPixel.jsx";

// Compact icon trigger for the search overlay. Used on mobile, where the full SearchBar doesn't fit; desktop uses the centered SearchBar instead. Mirrors the Vault button's chrome so the nav icons read as a set.
const SearchButton = ({ onClick, isOpen }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Search"
      aria-expanded={isOpen}
      className="z-30 flex-centered aspect-square h-12 rounded-xs border-[0.8px] border-text-main bg-text-main/20 backdrop-blur-2xl cursor-pointer hover:bg-text-main/30 hover:-rotate-10 transition-all text-text-main group"
    >
      <SearchPixel className="w-6 h-auto group-hover:rotate-10 transition-all" />
    </button>
  );
};

export default SearchButton;
