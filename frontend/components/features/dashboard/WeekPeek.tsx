"use client";

import Image from "next/image";
import Link from "next/link";
import { ErrorCard } from "@/components/features/ErrorCard";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { addDays, isToday, parseISODate, startOfWeek, toISODate } from "@/lib/dates";
import { useWeek } from "@/lib/queries";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeekPeek({ className }: { className?: string }) {
  const start = startOfWeek(new Date());
  const { data, isPending, isError, error, refetch } = useWeek(toISODate(start));

  if (isError && !data) return <div className={className}><ErrorCard error={error} onRetry={() => refetch()} /></div>;

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = toISODate(addDays(start, i));
    return { date, meals: data?.days.find((d) => d.date === date)?.meals ?? [] };
  });

  return (
    <Card as="section" aria-labelledby="this-week" className={cn("flex flex-col p-5", className)}>
      <h2 id="this-week" className="mb-4 text-title">This week</h2>
      {isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-11" />)}
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2">
          {days.map(({ date, meals }) => {
            const d = parseISODate(date);
            const today = isToday(date);
            return (
              <li key={date} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-paper text-xs leading-tight text-sage-deep",
                    today && "ring-2 ring-coral ring-offset-2 ring-offset-card",
                  )}
                  aria-label={today ? `${DAY[d.getDay()]} ${d.getDate()}, today` : undefined}
                >
                  <span className="font-medium">{DAY[d.getDay()]}</span>
                  <span className="font-display text-sm">{d.getDate()}</span>
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  {meals.length === 0 && <span className="text-sm text-muted">Nothing planned</span>}
                  {meals.slice(0, 2).map((m) => (
                    <Link
                      key={m.id}
                      href={`/recipes/${m.recipe_id}`}
                      className="flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-pill bg-cream py-1 pl-1 pr-3 text-sm text-ink"
                    >
                      <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-paper">
                        {m.recipe_image && <Image src={m.recipe_image} alt="" fill sizes="36px" className="object-cover" />}
                      </span>
                      <span className="truncate">{m.recipe_title}</span>
                    </Link>
                  ))}
                  {meals.length > 2 && <span className="text-sm font-medium text-sage-deep">+{meals.length - 2}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/planner" className="mt-5 inline-flex min-h-11 items-center self-start text-sm font-medium text-coral-deep underline">
        Open planner &rarr;
      </Link>
    </Card>
  );
}
