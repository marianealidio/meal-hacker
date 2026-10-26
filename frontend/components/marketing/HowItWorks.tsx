import type { ReactNode } from "react";
import { Blob, type BlobTone } from "@/components/brand/Blob";
import { Doodle } from "@/components/brand/Doodle";
import { Reveal } from "@/components/brand/Reveal";
import { ScriptNote } from "@/components/brand/ScriptNote";
import { cn } from "@/lib/cn";
import { BasketSketch, FridgeSketch, PanSketch } from "./StepIllustrations";

type Step = { title: string; body: ReactNode; art: ReactNode; tone: BlobTone; shape: 1 | 2 | 3 };

const STEPS: Step[] = [
  {
    title: "Stock your kitchen",
    body: "Add what's in your fridge, pantry and freezer. Type “2 red peppers” and we do the rest.",
    art: <FridgeSketch />,
    tone: "sage",
    shape: 1,
  },
  {
    title: "Get matched recipes",
    body: "Recipes ranked by what you already own, with whatever expires first at the top.",
    art: <PanSketch />,
    tone: "blush",
    shape: 2,
  },
  {
    title: "Plan and shop",
    body: "Drop meals into your week. Anything missing lands on your shopping list.",
    art: <BasketSketch />,
    tone: "butter",
    shape: 3,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-24 overflow-x-clip bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="flex flex-col items-center text-center">
          <ScriptNote arrow="down-left" className="ml-24">three little steps</ScriptNote>
          <h2 id="how-title" className="-mt-2 text-display-lg">
            How it works
          </h2>
        </Reveal>

        <ol className="relative mt-14 grid gap-6 md:mt-20 md:grid-cols-3 md:gap-8 lg:gap-12">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 0.1} className="relative">
              {i > 0 && (
                <Doodle
                  name="dashed-path"
                  className={cn(
                    "pointer-events-none absolute top-14 z-10 hidden size-20 text-coral-deep/75 md:block",
                    "-left-[3.25rem] lg:-left-[4.25rem]",
                    i === 1 ? "rotate-[38deg]" : "-scale-y-100 -rotate-[38deg]",
                  )}
                />
              )}
              <article className="flex h-full flex-col rounded-[28px] border border-line bg-card p-6 shadow-soft transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-lift sm:p-8">
                <div className="flex items-start justify-between">
                  <div className="relative grid size-32 place-items-center">
                    <Blob tone={step.tone} shape={step.shape} className="absolute inset-0 size-full" />
                    <div className="relative">{step.art}</div>
                  </div>
                  <span
                    aria-hidden="true"
                    className="grid size-11 place-items-center rounded-full bg-coral font-display text-lg font-semibold text-ink shadow-soft"
                  >
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-title">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2.5 leading-relaxed text-muted">{step.body}</p>
              </article>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
