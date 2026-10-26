"use client";

import { ErrorCard } from "@/components/features/ErrorCard";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStats } from "@/lib/queries";

export function WasteStat({ className }: { className?: string }) {
  const { data, isPending, isError, error, refetch } = useStats();

  if (isError && !data) return <div className={className}><ErrorCard error={error} onRetry={() => refetch()} /></div>;
  if (isPending || !data) return <div className={className} aria-busy="true"><Skeleton className="h-40 rounded-card" /></div>;

  return (
    <section aria-label="Waste saved this month" className={cn("rounded-card bg-sage p-6 text-sage-ink shadow-soft", className)}>
      <p className="font-display text-display-xl font-medium leading-none">{data.used_this_month}</p>
      <p className="mt-2 text-[0.95rem] font-medium">items used before they went off this month</p>
      <p className="mt-4 text-sm">
        {data.expiring_soon} expiring soon &middot; {data.items_in_kitchen} in your kitchen
      </p>
    </section>
  );
}
