import KaratLogo from "./jsx-assets/KaratLogo";

/*** Shown when the live API graph fetch fails (timeout / unreachable / empty). Pairs with useGraph()'s "error" status + retry(). The hint covers the common case: Render's free plan cold-starting on the first hit after idle. ***/
const GraphError = ({ onRetry, message = "Couldn't load the graph." }) => {
  return (
    <div className="fixed inset-0 h-screen w-screen z-50 flex flex-col items-center justify-center gap-6 bg-normalbg text-text-main">
      <div className="scale-[2] my-6">
        <KaratLogo />
      </div>
      <p className="p-large-h font-body-bold tracking-[0.2em] text-text-secondary uppercase text-center max-w-[80vw]">
        {message}
      </p>
      <p className="p-reg text-text-secondary text-center max-w-[60vw]">
        The server may be waking up. This can take up to a minute on first load.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-6 py-3 border border-text-secondary rounded-xs uppercase p-reg text-text-main cursor-pointer hover:bg-accentbg transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
};

export default GraphError;
