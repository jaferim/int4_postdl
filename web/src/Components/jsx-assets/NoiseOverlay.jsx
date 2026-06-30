export default function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 h-full w-full bg-noise animate-tv-static 
         contrast-100 opacity-50 not-first:sepia mix-blend-overlay"
    />
  );
}
