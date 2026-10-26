import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Three pen drawings for the how-it-works steps, in the same hand as Doodle:
 * sage-deep ink, round caps, slightly open joins, with flat colour washes
 * dropped a touch off-register like a cheap print.
 */
function Sketch({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-24", className)}
    >
      {children}
    </svg>
  );
}

const ink = "stroke-sage-deep";

export function FridgeSketch({ className }: { className?: string }) {
  return (
    <Sketch className={className}>
      {/* washes */}
      <rect x="30" y="14" width="40" height="72" rx="9" className="fill-card" />
      <rect x="49" y="50" width="13" height="15" rx="1.5" transform="rotate(6 55 57)" className="fill-butter" />
      <circle cx="58" cy="25" r="4.2" className="fill-coral" />
      {/* body, drawn in one loose loop */}
      <path
        d="M36.5 12.2c9-.6 18.4-.7 27.4-.2 4.4.3 6.6 2.9 6.8 7.3.6 19.6.5 39.2-.2 58.8-.2 4-2.6 6.2-6.6 6.4-9.4.5-18.6.5-28 .1-4.1-.2-6.4-2.6-6.5-6.6-.6-19.6-.5-39.3.3-58.9.2-4.1 2.6-6.6 6.8-6.9"
        className={ink}
        strokeWidth="2.4"
      />
      <path d="M29.9 37.6c13.6-.6 27.2-.6 40.8 0" className={ink} strokeWidth="2.2" />
      <path d="M37.2 20.4v9.2M37.2 45.6v13.8" className={ink} strokeWidth="2.6" />
      {/* note on a magnet */}
      <path d="M49.3 50.6l12.6 1.4-1.5 14-12.7-1.3 1.6-14.1M51.4 55.4l7.4.8M51 59.2l5.4.6" className={ink} strokeWidth="1.6" />
      <path d="M56.6 21.4a4.3 4.3 0 1 1-2.5 4.9" className={ink} strokeWidth="1.6" />
      {/* feet and a sprig peeking over the top */}
      <path d="M36 86.4v3.2M64 86.4v3.2" className={ink} strokeWidth="2.4" />
      <path d="M62.6 11.6c.4-3.2 1.6-6 3.8-8.2M65.2 6.6c2.5-.4 4.6.4 6.2 2.2-2.4.6-4.5-.1-6.2-2.2Z" className={ink} strokeWidth="1.6" />
    </Sketch>
  );
}

export function PanSketch({ className }: { className?: string }) {
  return (
    <Sketch className={className}>
      {/* washes */}
      <ellipse cx="42" cy="58" rx="27" ry="10.5" className="fill-card" />
      <circle cx="34" cy="56.5" r="5" className="fill-coral" />
      <circle cx="47.5" cy="59.5" r="4.4" className="fill-coral" />
      <path d="M50 52.4c3.6-2.6 7.8-2.8 11.4-.6-3.4 2.8-7.5 3-11.4.6Z" className="fill-sage" />
      {/* pan: rim, belly and handle */}
      <path
        d="M14.6 57.2c.4-6.6 12.4-10.6 27.6-10.5 15.4.1 27.4 4.4 27.4 10.9 0 6.2-12.4 10.6-27.6 10.4-15.6-.2-27.8-4.4-27.4-10.8"
        className={ink}
        strokeWidth="2.4"
      />
      <path d="M15.2 59.6c1.6 9 12.6 14.4 27 14.4 14.2 0 25-5.2 26.8-14" className={ink} strokeWidth="2.4" />
      <path d="M68.8 55.4c6.6-1.8 13-3.4 19.6-4.6 2-.3 3 .9 2.3 2.7-.5 1.4-1.6 2.1-3 2.4-6.2 1.4-12.4 2.8-18.6 4" className={ink} strokeWidth="2.4" />
      <path d="M34 51.6a5 5 0 1 1-4.2 6.8M47.4 55.2a4.4 4.4 0 1 1-3.6 5.8" className={ink} strokeWidth="1.6" />
      {/* steam */}
      <path d="M32.6 39.4c-3.2-3.4 2.4-5.8-.4-9.6-1.4-1.8-1-3.6.4-5.2" className={ink} strokeWidth="1.8" />
      <path d="M43.6 37.8c-3-3.6 2.6-6.4-.2-10.4" className={ink} strokeWidth="1.8" />
      <path d="M54 39.8c-2.6-3 2-5.2-.2-8.4" className={ink} strokeWidth="1.8" />
    </Sketch>
  );
}

export function BasketSketch({ className }: { className?: string }) {
  return (
    <Sketch className={className}>
      {/* washes: a baguette and a leek poking out, the basket body */}
      <path d="M30 46.6L45.4 16.8c1.6-3 5.6-2 5 1.4L43.6 46.6Z" className="fill-butter" />
      <path d="M55.4 46.6l9.2-24.4 6.2 2.6-6.6 21.8Z" className="fill-sage" />
      <path d="M17.6 46.6h60.8l-6.2 30.2c-.6 2.8-2.6 4.4-5.4 4.4H29.2c-2.8 0-4.8-1.6-5.4-4.4Z" className="fill-card" />
      {/* handle arc */}
      <path d="M26.4 46.4c1.6-14 9.8-22.8 21.8-23 12.2-.2 20.6 8.6 22 22.6" className={ink} strokeWidth="2.4" />
      {/* bread and leek outlines */}
      <path d="M30.6 45.8l14.8-28.8c1.6-3 5.6-2 5 1.4l-6.4 27.6M39.6 30l3.4 1.6M43 23.2l3.4 1.6" className={ink} strokeWidth="1.8" />
      <path d="M56.2 45.6l8.4-23.4 6.2 2.6-6.4 21M64.6 22.2c-.4-4.4 1-8.4 4.2-11.2M68.4 23.8c1.6-3.4 4.4-5.6 8.2-6.2" className={ink} strokeWidth="1.8" />
      {/* rim, body and weave */}
      <path d="M14.4 46.8c22.4-.8 44.8-.8 67.2.1" className={ink} strokeWidth="2.6" />
      <path d="M17.8 47.4l6.2 29.4c.6 2.8 2.6 4.4 5.4 4.4h37.4c2.8 0 4.8-1.6 5.4-4.4l6.2-29.6" className={ink} strokeWidth="2.4" />
      <path d="M20.6 59.6c18.2-.6 36.4-.6 54.6.1M22.8 70.4c16.6-.6 33.4-.6 50.2 0M36 48l1.6 32.6M48 47.8v33.2M60.2 48l-1.8 32.8" className={ink} strokeWidth="1.5" />
      {/* a ticked tag */}
      <circle cx="78.6" cy="70.6" r="9.2" className="fill-coral" />
      <path d="M74.4 70.8l3 3.2 5.6-6.6" className="stroke-ink" strokeWidth="2.2" />
    </Sketch>
  );
}
