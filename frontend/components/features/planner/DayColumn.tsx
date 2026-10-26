import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDay, formatLong, isToday } from "@/lib/dates";
import type { MealPlan } from "@/lib/types";
import { MealPill } from "./MealPill";
import { SLOTS } from "./MoveMealDialog";

/** One day: a card on mobile, a column on lg. Slot rows line up across columns through subgrid. */
export function DayColumn({ date, meals }: { date: string; meals: MealPlan[] }) {
  const today = isToday(date);
  return (
    <section
      aria-label={formatLong(date)}
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line bg-card p-4 shadow-soft",
        "lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:gap-y-3 lg:p-3",
        today && "border-t-4 border-t-coral",
      )}
    >
      <h3 className="flex items-baseline justify-between gap-2 font-display text-lg font-medium text-sage-deep">
        {formatDay(date)}
        {today && <span className="text-xs font-bold uppercase tracking-wide text-coral-deep">Today</span>}
      </h3>
      {SLOTS.map(({ value, label }) => {
        const inSlot = meals.filter((m) => m.slot === value);
        return (
          <div key={value} role="group" aria-label={label} className="flex min-w-0 flex-col gap-1.5">
            <p aria-hidden="true" className="text-xs font-bold uppercase tracking-wide text-muted">
              {label}
            </p>
            {inSlot.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {inSlot.map((m) => (
                  <MealPill key={m.id} meal={m} />
                ))}
              </ul>
            ) : (
              <Link
                href={`/recipes?plan_date=${date}&plan_slot=${value}`}
                aria-label={`Add ${value} on ${formatLong(date)}`}
                className="grid min-h-11 place-items-center rounded-2xl border-[1.5px] border-dashed border-line text-sage-deep transition-colors hover:border-sage hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep"
              >
                <Plus className="size-5" aria-hidden="true" />
              </Link>
            )}
          </div>
        );
      })}
    </section>
  );
}
