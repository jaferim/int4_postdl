const DashEllipse = ({
  scale,
  widthHeight = "w-[326px] h-[326px]",
  stroke,
  color = "var(--color-text-main)",
  animationClass = "animate-rotate",
}) => {
  return (
    <svg
      viewBox="0 0 326 326"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ willChange: "transform" }}
      className={`${animationClass} abs-centered ${scale} ${widthHeight}`}
    >
      <circle
        cx="162.791"
        cy="162.791"
        r="162.275"
        transform="rotate(6.95477 162.791 162.791)"
        stroke={color}
        stroke-width={stroke}
        stroke-opacity="0.6"
        stroke-dasharray="164 164"
      />
    </svg>
  );
};
export default DashEllipse;
