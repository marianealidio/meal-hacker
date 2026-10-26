import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ChipTone = "neutral" | "have" | "missing" | "soon";

const tones: Record<ChipTone, string> = {
  neutral: "bg-paper text-sage-deep",
  have: "bg-sage-tint text-sage-deep",
  missing: "bg-coral-tint text-coral-tint-ink",
  soon: "bg-butter/40 text-butter-ink",
};

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: ChipTone;
  icon?: ReactNode;
  children: ReactNode;
};

export function Chip({ tone = "neutral", icon, className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium leading-none",
        "[&_svg]:size-3.5 [&_svg]:shrink-0",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
