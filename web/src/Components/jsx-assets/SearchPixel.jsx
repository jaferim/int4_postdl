/*** Pixel-art magnifier on a fine 16x16 grid, so the pixels read small and refined like the Vault icon rather than chunky. The lens ring and the 2-wide handle are derived once from simple geometry (a circle band + a stair diagonal), then rendered as little squares. Uses currentColor to inherit the button's colour. ***/

const GRID = 16;
const UNIT = 24 / GRID; // viewBox is 0 0 24 24

function buildPixels() {
  const cx = 6.5;
  const cy = 6.5;
  const outer = 6;
  const inner = 4.4;
  const cells = new Map();
  const add = (c, r) => {
    if (c >= 0 && r >= 0 && c < GRID && r < GRID) cells.set(`${c},${r}`, [c, r]);
  };

  // Lens ring: the band between the inner and outer radius.
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const d = Math.hypot(c + 0.5 - cx, r + 0.5 - cy);
      if (d <= outer && d >= inner) add(c, r);
    }
  }

  // Handle: a 2-wide stair from the lens's lower-right out to the corner.
  let c = Math.round(cx + outer / Math.SQRT2);
  let r = Math.round(cy + outer / Math.SQRT2);
  while (c < GRID && r < GRID) {
    add(c, r);
    add(c + 1, r);
    c += 1;
    r += 1;
  }

  return [...cells.values()];
}

const PIXELS = buildPixels();

const SearchPixel = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {PIXELS.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          x={c * UNIT}
          y={r * UNIT}
          width={UNIT}
          height={UNIT}
          fill="currentColor"
        />
      ))}
    </svg>
  );
};

export default SearchPixel;
