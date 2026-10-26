import { ArrowUpRight } from "lucide-react";
import { Doodle } from "@/components/brand/Doodle";
import { Reveal } from "@/components/brand/Reveal";

/* On sage only sage-ink reads well (cream fails contrast), including the focus ring. */
export function ProblemBand() {
  return (
    <section aria-label="Food waste in the UK" className="relative isolate overflow-hidden bg-sage text-sage-ink">
      <Doodle
        name="lemon"
        className="pointer-events-none absolute -right-12 -top-14 -z-10 size-44 rotate-12 text-sage-ink opacity-[0.08] lg:size-60"
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.25fr_1fr] md:items-end md:gap-16 md:py-20 lg:px-8 lg:py-24">
        <Reveal>
          <p className="font-display text-display-lg font-medium tracking-[-0.03em] text-sage-ink">4.5 million tonnes</p>
          <p className="mt-3 max-w-[30ch] text-title text-sage-ink">
            of edible food is thrown away by UK households every year.
          </p>
          <p className="mt-6 text-sm text-sage-ink">
            Source:{" "}
            <a
              href="https://www.wrap.ngo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline decoration-sage-ink/60 decoration-1 underline-offset-4 transition-colors hover:decoration-sage-ink focus-visible:outline-sage-ink"
            >
              WRAP, Courtauld Commitment 2025 report
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </p>
        </Reveal>

        <Reveal delay={0.12} className="md:border-l md:border-sage-ink/25 md:pb-1 md:pl-10">
          <p className="max-w-[24ch] font-display text-display-md italic text-sage-ink">
            Most of it is food we forgot we had. Meal Hacker remembers for you.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
