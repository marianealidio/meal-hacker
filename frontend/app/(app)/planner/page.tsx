"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorCard } from "@/components/features/ErrorCard";
import { PageHeader } from "@/components/features/PageHeader";
import { WeekBoard } from "@/components/features/planner/WeekBoard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { addDays, formatWeekRange, parseISODate, startOfWeek, toISODate } from "@/lib/dates";
import { useWeek } from "@/lib/queries";

const ARROW =
  "grid size-11 place-items-center rounded-full text-sage-deep transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep";

export default function PlannerPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <PlannerBody />
    </Suspense>
  );
}

function BoardSkeleton() {
  return (
    <div aria-busy="true" className="grid grid-cols-1 gap-4 lg:grid-cols-7">
      {Array.from({ length: 7 }, (_, i) => (
        <Skeleton key={i} className="h-48 rounded-card lg:h-96" />
      ))}
    </div>
  );
}

function weekFromParam(param: string | null): string {
  const parsed = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? parseISODate(param) : null;
  return toISODate(startOfWeek(parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date()));
}

function PlannerBody() {
  const router = useRouter();
  const week = weekFromParam(useSearchParams().get("week"));
  const { data, isError, error, refetch } = useWeek(week);

  const go = (iso: string | null) => router.push(iso ? `/planner?week=${iso}` : "/planner", { scroll: false });
  const shift = (n: number) => go(toISODate(addDays(parseISODate(week), n)));

  return (
    <div className="flex flex-col gap-2">
      <PageHeader kicker="breakfast, lunch and dinner" title="Planner" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Previous week" onClick={() => shift(-7)} className={ARROW}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Next week" onClick={() => shift(7)} className={ARROW}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
        <p aria-live="polite" className="px-1 font-display text-lg font-medium text-sage-deep">
          {formatWeekRange(week)}
        </p>
        <Button variant="ghost" onClick={() => go(null)} className="sm:ml-auto">
          This week
        </Button>
      </div>
      {isError && !data ? (
        <ErrorCard error={error} onRetry={() => refetch()} />
      ) : !data ? (
        <BoardSkeleton />
      ) : (
        <WeekBoard start={week} week={data} />
      )}
    </div>
  );
}
