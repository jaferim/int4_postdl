import KaratLogo from "./jsx-assets/KaratLogo";

/*** Shared friendly crash screen. ***

Used by both the top-level ErrorBoundary (catches errors in providers / outside the router) and the router's errorElement (catches crashes inside route components, which the data router intercepts before they reach a class boundary).

Recovery is a full reload because a thrown render error leaves the tree unrecoverable. ***/
const ErrorScreen = ({
  title = "Something went wrong.",
  message = "An unexpected error interrupted the page. Reloading usually fixes it.",
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
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-6 py-3 border border-text-secondary rounded-xs uppercase p-reg text-text-main cursor-pointer hover:bg-accentbg transition-colors"
      >
        Reload
      </button>
    </div>
  );
};

export default ErrorScreen;
