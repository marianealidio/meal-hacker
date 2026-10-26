import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type EmptyStateProps = {
  illustration: ReactNode;
  title: ReactNode;
  body: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ illustration, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn("mx-auto flex max-w-sm flex-col items-center px-4 py-12 text-center", className)}>
      <div className="relative mb-6 grid size-36 place-items-center" aria-hidden="true">
        <div className="absolute inset-2 rounded-full bg-sage-tint/70" />
        <div className="relative">{illustration}</div>
      </div>
      <h3 className="text-display-md text-sage-deep">{title}</h3>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
