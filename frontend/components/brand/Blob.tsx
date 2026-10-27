import { cn } from "@/lib/cn";

export type BlobTone = "sage" | "blush" | "butter" | "coral";

const tones: Record<BlobTone, string> = {
  sage: "fill-sage/35",
  blush: "fill-blush/70",
  butter: "fill-butter/55",
  coral: "fill-coral/30",
};

/* Three lumpy, pebble-like silhouettes on a 200x200 grid (closed Catmull-Rom curves through uneven radii). */
const SHAPES = {
  1: "M180.2 124.8C174.3 140.6 148.8 150.5 131.4 159.4C113.9 168.4 89.6 184.0 75.7 178.6C61.8 173.3 56.2 144.3 48.0 127.4C39.7 110.5 24.3 94.6 26.2 77.2C28.0 59.7 43.8 29.1 59.2 22.7C74.7 16.4 100.9 32.0 118.9 39.0C136.8 46.0 156.6 50.4 166.9 64.7C177.1 79.0 186.2 109.0 180.2 124.8Z",
  2: "M136.2 171.1C116.8 181.9 78.9 190.4 63.1 181.1C47.3 171.7 45.0 135.7 41.3 114.8C37.7 93.8 31.7 71.6 41.2 55.2C50.7 38.7 81.3 14.5 98.2 16.0C115.0 17.6 129.0 47.8 142.6 64.5C156.2 81.2 180.9 98.6 179.8 116.4C178.8 134.2 155.6 160.3 136.2 171.1Z",
  3: "M63.3 180.2C51.0 174.1 49.9 143.2 43.9 126.7C37.8 110.1 24.1 94.8 26.8 81.0C29.5 67.2 46.7 55.8 60.1 43.9C73.5 32.0 93.7 7.2 107.3 9.6C120.8 11.9 130.5 44.2 141.3 58.1C152.1 72.1 167.7 78.6 171.9 93.2C176.1 107.8 175.5 134.1 166.4 145.8C157.3 157.4 134.6 157.4 117.4 163.2C100.2 168.9 75.6 186.3 63.3 180.2Z",
} as const;

export function Blob({
  className,
  tone,
  shape = 1,
}: {
  className?: string;
  tone: BlobTone;
  shape?: keyof typeof SHAPES;
}) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false" className={cn("pointer-events-none", className)}>
      <path d={SHAPES[shape]} className={tones[tone]} />
    </svg>
  );
}
