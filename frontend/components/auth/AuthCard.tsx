import type { ReactNode } from "react";

/** Raised card that holds an auth form: the heading, a short lead and the form itself. */
export function AuthCard({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-lift sm:p-9">
      <h1 className="font-display text-[2rem] font-medium leading-tight tracking-[-0.02em] text-sage-deep">{title}</h1>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{lead}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}
