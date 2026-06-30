const ProgressDots = ({ part }) => {
  return (
    <div className="flex gap-2 lg:gap-4">
      <div className={`progress-dot ${part >= 1 ? "dot-active" : ""}`}></div>
      <div className={`progress-dot ${part >= 2 ? "dot-active" : ""}`}></div>
      <div className={`progress-dot ${part >= 3 ? "dot-active" : ""}`}></div>
    </div>
  );
};

export default ProgressDots;