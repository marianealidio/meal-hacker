import { Check, Clock } from "lucide-react";
import { ArchImage } from "@/components/brand/ArchImage";
import { Blob } from "@/components/brand/Blob";
import { Doodle } from "@/components/brand/Doodle";
import { ScriptNote } from "@/components/brand/ScriptNote";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { OpenKitchenButton } from "./OpenKitchenButton";

export const HERO_SUB =
  "Meal Hacker turns the ingredients already in your kitchen into recipes, a week plan and a shopping list, before anything goes off.";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80";

/*
 * Text and buttons are visible at first paint (they are the LCP). Only the photo, floating
 * cards and doodles get a short CSS entrance; globals.css flattens it under reduced motion.
 */
const rise = "animate-[mh-slide-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both]";
const float = "animate-[mh-float_6s_ease-in-out_infinite]";
const drift = "animate-[mh-drift_14s_ease-in-out_infinite]";

/** A loose coral pen stroke under the second line of the headline. */
function Underline() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 300 18"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -bottom-[0.08em] left-[2%] h-[0.22em] w-[96%] overflow-visible"
    >
      <path
        d="M3 12.5C58 6.8 121 4.1 189 5.6c38 .8 74 3.2 108 6.9M41 15.6c46-3.4 95-4.6 146-3.4"
        fill="none"
        className="stroke-coral"
        strokeWidth="3.2"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        style={{ animation: "mh-draw 0.6s 0.1s cubic-bezier(0.65,0,0.35,1) both" }}
      />
    </svg>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-x-clip bg-cream">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="relative">
          <span aria-hidden="true" className={cn("absolute -left-1 top-24 hidden sm:block lg:-left-10", drift)}>
            <Doodle name="sparkle" className="size-9 text-coral" />
          </span>

          <div>
            <ScriptNote arrow="down-right" className="ml-1 text-[1.75rem] sm:ml-3">
              fresh from your fridge
            </ScriptNote>
          </div>

          <h1 id="hero-title" className="mt-1 text-display-xl text-sage-deep">
            <span className="block">Cook what you have.</span>{" "}
            <span className="block">
              <span className="relative inline-block italic text-coral-deep">
                Waste nothing.
                <Underline />
              </span>
            </span>
          </h1>

          <p className="mt-7 max-w-[46ch] text-lg leading-relaxed text-muted sm:text-[1.15rem]">
            {HERO_SUB}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <OpenKitchenButton arrow size="lg" />
            <ButtonLink variant="secondary" size="lg" href="/signup">
              Sign up free
            </ButtonLink>
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm text-muted">
            <Check aria-hidden="true" className="size-4 text-sage-deep" strokeWidth={2.4} />
            No sign-up needed for the demo kitchen.
          </p>
        </div>

        <div className={cn("relative mx-auto w-[80vw] max-w-[27rem] sm:w-[22rem] lg:mr-0 lg:w-full", rise)}>
          <ArchImage
            src={HERO_IMAGE}
            alt="A colourful bowl of roasted vegetables, grains and greens"
            sizes="(min-width: 1024px) 432px, (min-width: 640px) 352px, 80vw"
            priority
            className="aspect-[4/5]"
          >
            <Blob tone="sage" shape={2} className="absolute -bottom-[14%] -left-[26%] -z-10 w-[112%] max-w-none rotate-[-8deg]" />
            {/* a hairline arch offset behind the photo, like a pencil guide */}
            <div aria-hidden="true" className="absolute inset-0 -z-10 translate-x-3 -translate-y-3 rounded-arch border-[1.5px] border-sage-deep/25 sm:translate-x-4 sm:-translate-y-4" />
          </ArchImage>

          <span aria-hidden="true" className={cn("absolute -right-3 -top-8 sm:-right-8", drift)} style={{ animationDelay: "-5s" }}>
            <Doodle name="sprig" className="size-16 rotate-[18deg] text-sage-deep/70 sm:size-20" />
          </span>

          <div className={cn("absolute -left-[6vw] top-[16%] sm:-left-16", float)}>
            <Card className="flex items-center gap-3 py-3 pl-3 pr-4 shadow-lift">
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-coral-tint">
                <Clock className="size-[1.1rem] text-coral-deep" strokeWidth={2.2} />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-coral-deep">3 items expiring</span>
                <span aria-hidden="true" className="mt-1.5 flex gap-1">
                  <span className="h-1 w-6 rounded-pill bg-coral" />
                  <span className="h-1 w-6 rounded-pill bg-butter" />
                  <span className="h-1 w-6 rounded-pill bg-butter" />
                </span>
              </span>
            </Card>
          </div>

          <div className={cn("absolute -right-[5vw] bottom-[12%] sm:-right-12 lg:-right-4 xl:-right-12", float)} style={{ animationDelay: "-3s" }}>
            <Card className="max-w-[15rem] py-3 pl-4 pr-4 shadow-lift">
              <p className="font-display text-[1.05rem] leading-tight text-sage-deep">Pasta primavera</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                <Chip tone="have">uses 5</Chip>
                of yours
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
