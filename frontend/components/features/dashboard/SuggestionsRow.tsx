"use client";

import { MealCard } from "@/components/features/MealCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSuggestions } from "@/lib/queries";

const CARDS = "w-[min(16rem,72vw)] shrink-0 snap-start lg:w-auto";

/** Results 2-4. Its error and empty states are covered by the pick slot, so it just hides itself. */
export function SuggestionsRow({ className }: { className?: string }) {
  const { data, isPending } = useSuggestions();

  if (isPending) {
    return (
      <section className={className} aria-busy="true">
        <Skeleton className="mb-4 h-8 w-40" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="hidden h-72 rounded-card sm:block" />
          <Skeleton className="hidden h-72 rounded-card sm:block" />
        </div>
      </section>
    );
  }

  const more = data?.data.results.slice(1, 4) ?? [];
  if (more.length < 1) return null;

  return (
    <section className={className} aria-labelledby="more-ideas">
      <h2 id="more-ideas" className="mb-4 text-display-md">More ideas</h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
        {more.map((r) => (
          <div key={r.id} className={CARDS}>
            <MealCard recipe={r} size="standard" />
          </div>
        ))}
      </div>
    </section>
  );
}
