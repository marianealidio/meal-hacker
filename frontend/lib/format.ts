export function formatMinutes(m: number | null): string {
  if (m === null || m <= 0) return "";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} hr ${rest} min` : `${h} hr`;
}

const FRACTIONS: [number, string][] = [
  [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"],
];
const TOLERANCE = 0.02;

/** Scales a recipe amount to a new serving count, using friendly fractions for small values. */
export function scaleAmount(amount: number | null, from: number, to: number): string {
  if (amount === null || !from) return "";
  const v = (amount * to) / from;
  if (v >= 10) return String(Math.round(v * 10) / 10);
  let whole = Math.floor(v);
  const frac = v - whole;
  if (frac > 1 - TOLERANCE) whole += 1;
  else if (frac >= TOLERANCE) {
    const hit = FRACTIONS.find(([f]) => Math.abs(frac - f) < TOLERANCE);
    if (hit) return whole ? `${whole} ${hit[1]}` : hit[1];
    return String(Math.round(v * 10) / 10);
  }
  return String(whole);
}
