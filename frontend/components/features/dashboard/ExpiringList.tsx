"use client";

import Link from "next/link";
import { Doodle } from "@/components/brand/Doodle";
import { ErrorCard } from "@/components/features/ErrorCard";
import { ExpiryBar } from "@/components/features/ExpiryBar";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { relativeExpiry, type ExpiryTone } from "@/lib/dates";
import { useInventory } from "@/lib/queries";

const TONE: Record<ExpiryTone, string> = {
  today: "text-coral-tint-ink",
  soon: "text-butter-ink",
  fine: "text-sage-deep",
  expired: "text-coral-tint-ink",
  none: "text-muted",
};

export function ExpiringList({ className }: { className?: string }) {
  const { data, isPending, isError, error, refetch } = useInventory();

  if (isError && !data) return <div className={className}><ErrorCard error={error} onRetry={() => refetch()} /></div>;

  const items = (data ?? [])
    .filter((i) => i.days_left !== null && i.days_left <= 3)
    .sort((a, b) => (a.days_left ?? 0) - (b.days_left ?? 0))
    .slice(0, 6);

  return (
    <Card as="section" aria-labelledby="expiring-soon" className={cn("flex flex-col p-5", className)}>
      <h2 id="expiring-soon" className="mb-4 text-title">Expiring soon</h2>
      {isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <Doodle name="sparkle" className="size-12 text-coral-deep" />
          <p className="text-[0.95rem] text-muted">Nothing&rsquo;s about to go off. Nice.</p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-4">
          {items.map((i) => {
            const { label, tone } = relativeExpiry(i.days_left);
            return (
              <li key={i.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-ink">{i.name}</span>
                  <span className={`shrink-0 text-sm font-medium ${TONE[tone]}`}>{label}</span>
                </div>
                <ExpiryBar daysLeft={i.days_left} />
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/kitchen" className="mt-5 inline-flex min-h-11 items-center self-start text-sm font-medium text-coral-deep underline">
        Open your kitchen &rarr;
      </Link>
    </Card>
  );
}
