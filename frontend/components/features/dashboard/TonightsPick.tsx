"use client";

import { useState } from "react";
import { AddToPlanDialog } from "@/components/features/AddToPlanDialog";
import { ErrorCard } from "@/components/features/ErrorCard";
import { MealCard } from "@/components/features/MealCard";
import { StaleNotice } from "@/components/features/StaleNotice";
import { Doodle } from "@/components/brand/Doodle";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSuggestions } from "@/lib/queries";

export function TonightsPick({ className }: { className?: string }) {
  const { data, isPending, isError, error, refetch } = useSuggestions();
  const [planning, setPlanning] = useState<{ id: number; title: string } | null>(null);

  if (isError && !data) return <div className={className}><ErrorCard error={error} onRetry={() => refetch()} /></div>;
  if (isPending || !data) {
    return (
      <div className={className} aria-busy="true">
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    );
  }

  const { results, reason } = data.data;
  const first = results[0];

  return (
    <div className={className}>
      {data.stale && <div className="mb-3"><StaleNotice /></div>}
      {first ? (
        <>
          <MealCard recipe={first} size="hero" onAddToPlan={() => setPlanning({ id: first.id, title: first.title })} />
          {planning && (
            <AddToPlanDialog recipe={planning} open onOpenChange={(o) => { if (!o) setPlanning(null); }} />
          )}
        </>
      ) : reason === "need_more_ingredients" ? (
        <Card>
          <EmptyState
            illustration={<Doodle name="lemon" className="size-16 text-coral-deep" />}
            title="Add a few more ingredients"
            body="Meal ideas appear once your kitchen has at least three ingredients."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ButtonLink href="/kitchen">Add ingredients</ButtonLink>
                <ButtonLink href="/onboarding" variant="secondary">Quick start</ButtonLink>
              </div>
            }
          />
        </Card>
      ) : (
        <Card>
          <EmptyState
            illustration={<Doodle name="lemon" className="size-16 text-coral-deep" />}
            title="No matches yet"
            body="Try adding a staple like rice, pasta or eggs."
            action={<ButtonLink href="/kitchen">Add ingredients</ButtonLink>}
          />
        </Card>
      )}
    </div>
  );
}
