import type { ReactNode } from "react";

export type PageHeaderProps = { kicker?: string; title: string; actions?: ReactNode };

export function PageHeader({ kicker, title, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker && <p className="font-script text-[1.5rem] leading-none text-coral-deep">{kicker}</p>}
        <h1 className="text-display-md text-sage-deep">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
