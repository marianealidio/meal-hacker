import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Blob, type BlobTone } from "@/components/brand/Blob";
import { Reveal } from "@/components/brand/Reveal";
import { ScriptNote } from "@/components/brand/ScriptNote";
import { cn } from "@/lib/cn";
import { Parallax } from "./Parallax";

export type FeatureRowProps = {
  index: number;
  total: number;
  kicker: string;
  title: string;
  body: string;
  bullets: readonly string[];
  /** The preview; it is decorative, so `visualLabel` summarises it for screen readers. */
  visual: ReactNode;
  visualLabel: string;
  tone: BlobTone;
  shape?: 1 | 2 | 3;
  /** Puts the visual on the right at desktop widths. */
  reverse?: boolean;
};

export function FeatureRow({ index, total, kicker, title, body, bullets, visual, visualLabel, tone, shape = 1, reverse = false }: FeatureRowProps) {
  return (
    <div className="grid items-center gap-12 md:grid-cols-2 md:gap-14 lg:gap-24">
      <Reveal className={cn("max-w-[34rem]", reverse ? "md:order-first" : "md:order-last")}>
        <p aria-hidden="true" className="flex items-center gap-3 text-xs font-medium tabular-nums tracking-[0.18em] text-muted">
          <span>{String(index).padStart(2, "0")}</span>
          <span className="h-px w-8 bg-line" />
          <span>{String(total).padStart(2, "0")}</span>
        </p>
        <ScriptNote className="mt-5">{kicker}</ScriptNote>
        <h3 className="mt-1 text-display-md">{title}</h3>
        <p className="mt-4 text-[1.05rem] leading-relaxed text-muted">{body}</p>
        <ul className="mt-6 flex flex-col gap-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-3 text-[0.98rem] text-ink">
              <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-sage-tint">
                <Check className="size-3.5 text-sage-deep" strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={0.1} className="relative mx-auto w-full max-w-[30rem]">
        <Blob
          tone={tone}
          shape={shape}
          className={cn(
            "absolute w-[92%] max-w-none",
            reverse ? "-right-[16%] -top-[16%] rotate-[14deg]" : "-bottom-[18%] -left-[16%] -rotate-[10deg]",
          )}
        />
        <Parallax className="relative">
          <div role="img" aria-label={visualLabel}>
            <div aria-hidden="true">{visual}</div>
          </div>
        </Parallax>
      </Reveal>
    </div>
  );
}
