const ZoomControls = ({ api }) => {
  const btn =
    "w-9 h-9 flex-centered rounded-xs border-[0.4px] border-text-secondary/60 text-text-secondary text-xl leading-none pb-0.5 bg-normalbg/30 backdrop-blur-sm cursor-pointer hover:border-text-main hover:text-text-main transition-all duration-300 ease-out pointer-events-auto";

  return (
    <div className="fixed right-4 bottom-30 flex flex-col md:flex-row gap-3">
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => api.current?.zoomIn()}
        className={btn}
      >
        +
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => api.current?.zoomOut()}
        className={btn}
      >
        −
      </button>
    </div>
  );
};

export default ZoomControls;
