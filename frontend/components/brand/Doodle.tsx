import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DoodleName = "leaf" | "sprig" | "sparkle" | "whisk" | "lemon" | "heart" | "arrow" | "dashed-path";

/*
 * Little pen drawings on a 48x48 grid. Strokes are slightly uneven on purpose
 * (open ends, overshoots, a wobble here and there) so they read as hand-drawn.
 * Colour comes from currentColor; accents use a low-opacity fill of the same colour.
 */
const DRAWINGS: Record<DoodleName, ReactNode> = {
  leaf: (
    <>
      <path d="M9.5 38.5C8.6 25.4 17.2 12.6 39.6 8.4c1.6 19.8-10.2 30.9-30.1 30.1Z" fill="currentColor" fillOpacity="0.1" />
      <path d="M9.5 38.5C8.6 25.4 17.2 12.6 39.6 8.4c1.6 19.8-10.2 30.9-30.1 30.1" />
      <path d="M5.5 42.5c8.4-7.9 17.6-17.8 27.6-27.7" />
      <path d="M15.6 32.4c-.9-2.6-1-5.2-.4-8M15.6 32.4c2.7.6 5.4.7 8.1.3" />
      <path d="M21.6 26.4c-.7-3-.6-5.9.3-8.9M21.6 26.4c3 .6 6 .5 8.9-.4" />
      <path d="M27.3 20.6c-.3-2.2 0-4.3.9-6.4M27.3 20.6c2.3.3 4.5 0 6.6-.9" />
    </>
  ),
  sprig: (
    <>
      <path d="M24.6 45c-1.8-8.4-1.2-17 .2-25.2.9-5.3.4-10.1-1.8-15.3" />
      <path d="M24.2 37.4c-4.6-.4-8.1-3-9.6-7.6 4.7-.2 8.3 2.4 9.6 7.6Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M24.4 32.2c4.3-1.2 7.1-4.5 7.6-9.3-4.5 1-7.4 4.2-7.6 9.3Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M24.6 25.4c-4.1-.9-6.8-3.8-7.4-8.1 4.1.6 6.8 3.4 7.4 8.1Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M25 19.4c3.8-1.4 6-4.4 6.1-8.6-3.9 1.3-6.1 4.3-6.1 8.6Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M24.4 12.6c-3.2-1.1-5-3.6-5.1-7.1 3.2 1 5 3.5 5.1 7.1Z" fill="currentColor" fillOpacity="0.12" />
    </>
  ),
  sparkle: (
    <>
      <path d="M22 7.5c.9 9.6 3.3 13.5 13.5 15.4-10 2-12.5 5.8-13.4 16-1.1-10.3-3.7-14.1-13.6-16 9.9-1.8 12.5-5.6 13.5-15.4Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M22 7.5c.9 9.6 3.3 13.5 13.5 15.4-10 2-12.5 5.8-13.4 16-1.1-10.3-3.7-14.1-13.6-16 9.9-1.8 12.5-5.6 13.5-15.4" />
      <path d="M38.5 5.5v7M35 9h7" />
      <circle cx="39" cy="38" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="40.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  whisk: (
    <g transform="rotate(-32 24 24)">
      <rect x="21" y="30.5" width="6" height="14" rx="3" />
      <path d="M19.6 30.5h8.8" />
      <path d="M21.4 30.5C12.6 23.2 13.4 3.8 24 3.6c10.6.2 11.4 19.6 2.6 26.9" />
      <path d="M22.8 30.5c-4.8-6.6-4.4-22.3 1.2-22.5 5.6.2 6 15.9 1.2 22.5" />
      <path d="M24 30.5V8.4" />
      <path d="M24 39.5v1.5" />
    </g>
  ),
  lemon: (
    <>
      <path d="M24 7.2c9.4-.3 16.9 7.2 16.8 16.6-.1 9.3-7.6 16.9-16.9 16.9-9.4.1-16.9-7.6-16.8-17C7.2 14.4 14.8 7 24 7.2Z" />
      <circle cx="24" cy="23.9" r="12.6" fill="currentColor" fillOpacity="0.12" strokeWidth="1.6" />
      <path d="M24 21.4v-8.2M26.2 22.7l7-4.1M26.2 25.2l7 4.1M24 26.5v8.2M21.8 25.2l-7 4.1M21.8 22.7l-7-4.1" strokeWidth="1.8" />
    </>
  ),
  heart: (
    <>
      <path d="M24 40.6C14.3 34.2 7.2 27.4 7.3 18.6c0-5.8 4.1-9.8 9.1-9.8 3.6 0 6.2 2 7.6 5.4 1.5-3.4 4.1-5.4 7.7-5.4 5 0 9 4 9 9.8 0 8.8-7.1 15.6-16.7 22Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M22.6 39.4C13.8 33.4 7.2 26.9 7.3 18.6c0-5.8 4.1-9.8 9.1-9.8 3.6 0 6.2 2 7.6 5.4 1.5-3.4 4.1-5.4 7.7-5.4 5 0 9 4 9 9.8 0 8.8-7.1 15.6-16.7 22-.7.5-1.4.4-2.3-.3" />
      <path d="M12.4 17.2c.3-2.2 1.8-3.8 4-4.2" strokeWidth="1.8" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 9.5c7.2-3.4 15.6-2.6 18.4 3.6 2.2 5-1 10.4-4.6 9-3.4-1.4-1.6-7.6 4-8.8 8.1-1.7 13.6 6.2 15.4 13.4 1 3.8 1.3 7.4 1 10.8" />
      <path d="M32.2 33.2c2.4 1.8 4.6 3.6 6.8 5.6 1.4-2.6 2.6-5.4 3.6-8.4" />
    </>
  ),
  "dashed-path": (
    <>
      <path d="M4.5 41.5c6.6-.6 9.4-5 10.4-10.6 1.2-6.8 5.6-9.6 11.4-8.4 6.4 1.3 9.6-2.6 10-8.4.3-3.6 2-6 5.2-7.4" strokeDasharray="0.1 5.2" strokeWidth="2.5" />
      <path d="M38.2 3.8l5.8 2.6-3 5.4" />
      <circle cx="4.5" cy="41.5" r="2" fill="currentColor" stroke="none" />
    </>
  ),
};

export function Doodle({ name, className }: { name: DoodleName; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-12 shrink-0", className)}
    >
      {DRAWINGS[name]}
    </svg>
  );
}
