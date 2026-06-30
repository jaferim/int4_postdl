import { useLocation, useNavigate } from "react-router-dom";
import BaseArrow from "./jsx-assets/BaseArrow";

// Back control, shown only on detail routes. Steps back through history so the
// visitor lands wherever they came from (the canvas, or the previous facet they
// drilled in from); falls back to the canvas on a fresh deep-link.
//
// It renders INLINE as the first item of the top nav row, to the left of the
// logo, on both mobile and desktop (it returns null on home, so the logo stays
// flush-left there). Square icon (no "Back" label) sized to match the nav chrome.
const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/") return null;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className="shrink-0 w-10 h-10 flex-centered rounded-xs border-[0.4px] border-text-main/60 text-text-secondary bg-text-main/5 backdrop-blur-sm cursor-pointer hover:border-text-main hover:text-text-main transition-all duration-300 ease-out group"
    >
      <BaseArrow
        className="w-4 h-4 group-hover:-translate-x-1 transition-all duration-300 ease-out"
        empty={false}
      />
    </button>
  );
};

export default BackButton;
