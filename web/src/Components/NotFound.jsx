import { Link } from "react-router-dom";
import KaratLogo from "./jsx-assets/KaratLogo";

/*** Shared 404 screen. ***

Rendered by the router's catch-all route (see main.jsx) for unknown URLs, and by ItemDetail when the :itemId doesn't match any loaded node (otherwise that page sits under the shared loading overlay forever).

Visual mirrors ErrorScreen, but recovery is a link back home rather than a reload, since nothing crashed. ***/
const NotFound = ({
  title = "Page not found.",
  message = "We couldn't find what you were looking for. It may have moved, or never existed.",
}) => {
  return (
    <div className="fixed inset-0 h-screen w-screen z-50 flex flex-col items-center justify-center gap-6 bg-normalbg text-text-main">
      <div className="scale-[2] my-6">
        <KaratLogo />
      </div>
      <p className="p-large-h font-body-bold tracking-[0.2em] text-text-secondary uppercase text-center max-w-[80vw]">
        {title}
      </p>
      <p className="p-reg text-text-secondary text-center max-w-[60vw]">
        {message}
      </p>
      <Link
        to="/"
        className="px-6 py-3 border border-text-secondary rounded-xs uppercase p-reg text-text-main cursor-pointer hover:bg-accentbg transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
};

export default NotFound;
