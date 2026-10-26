/*
 * Fractal noise tile, desaturated, used as a repeating background. A data-URI SVG
 * keeps the filter cost to one small tile instead of a full-viewport filter.
 */
const NOISE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">` +
      `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>` +
      `<feColorMatrix type="saturate" values="0"/></filter>` +
      `<rect width="100%" height="100%" filter="url(#n)"/></svg>`,
  );

export function PaperGrain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] opacity-[0.035] mix-blend-multiply"
      style={{ backgroundImage: `url("${NOISE}")`, backgroundSize: "180px 180px" }}
    />
  );
}
