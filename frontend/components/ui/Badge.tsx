import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Badge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border border-line bg-card px-2.5 py-0.5 text-xs font-medium text-muted",
        className,
      )}
      {...rest}
    />
  );
}
