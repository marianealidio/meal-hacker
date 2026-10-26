import { cn } from "@/lib/cn";

/** The mark on its own: a sage-deep badge holding a fork whose handle sprouts a leaf. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={cn("size-9 shrink-0", className)}>
      <circle cx="24" cy="24" r="24" className="fill-sage-deep" />
      <circle cx="24" cy="24" r="20.5" fill="none" className="stroke-cream" strokeOpacity="0.22" strokeWidth="1" />
      <g fill="none" className="stroke-cream" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {/* fork: outer tines and bowl, centre tine, handle */}
        <path d="M15.5 11.5v6.5a3.5 3.5 0 0 0 7 0v-6.5" />
        <path d="M19 11.5v10" />
        <path d="M19 21.5V37" />
      </g>
      {/* leaf growing from the handle */}
      <path d="M19.8 31.6C20.1 24 24.6 18.4 33.2 16.4c.7 8.3-4.3 14.6-13.4 15.2Z" className="fill-cream" />
      <path
        d="M21 30.4c3-3.3 6.1-6.9 9.4-10.9"
        fill="none"
        className="stroke-sage-deep"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* a single coral seed: the brand's warm accent */}
      <circle cx="33.4" cy="31.6" r="2" className="fill-coral" />
    </svg>
  );
}

export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <span role="img" aria-label="Meal Hacker" className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {withWordmark && (
        <span aria-hidden="true" className="font-display text-[1.35rem] font-medium leading-none tracking-[-0.02em] text-sage-deep">
          Meal <span className="italic text-coral-deep">Hacker</span>
        </span>
      )}
    </span>
  );
}
