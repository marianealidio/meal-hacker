"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Doodle } from "@/components/brand/Doodle";
import { AddToPlanDialog } from "@/components/features/AddToPlanDialog";
import { ErrorCard } from "@/components/features/ErrorCard";
import { MealCard } from "@/components/features/MealCard";
import { PageHeader } from "@/components/features/PageHeader";
import { StaleNotice } from "@/components/features/StaleNotice";
import { FilterBar } from "@/components/features/recipes/FilterBar";
import { filtersFromParams, filtersToQuery, hasFilters } from "@/components/features/recipes/filters";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SearchParams } from "@/lib/api";
import { useSearch } from "@/lib/queries";
import type { Slot } from "@/lib/types";

const SLOT_VALUES: Slot[] = ["breakfast", "lunch", "dinner"];
const planDefaults = (params: URLSearchParams) => {
  const date = params.get("plan_date");
  const slot = params.get("plan_slot");
  return {
    defaultDate: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    defaultSlot: SLOT_VALUES.find((s) => s === slot),
  };
};

const GRID = "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";

export default function RecipesPage() {
  return (
    <Suspense fallback={<RecipesSkeleton />}>
      <RecipesBody />
    </Suspense>
  );
}

function RecipesSkeleton() {
  return (
    <div aria-busy="true" className={GRID}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-96 rounded-card" />
      ))}
    </div>
  );
}

function RecipesBody() {
  const router = useRouter();
  const params = useSearchParams();
  const filters = filtersFromParams(params);
  const { data, isError, error, refetch } = useSearch(filters);
  const [resetKey, setResetKey] = useState(0);
  const active = hasFilters(filters);
  const [planning, setPlanning] = useState<{ id: number; title: string } | null>(null);

  // Filtering must not lose the slot the user came here to fill.
  const planQuery = (base: string) => {
    const keep = new URLSearchParams();
    for (const k of ["plan_date", "plan_slot"]) if (params.get(k)) keep.set(k, params.get(k)!);
    const extra = keep.toString();
    return extra ? `${base}${base ? "&" : "?"}${extra}` : base;
  };

  function update(patch: SearchParams) {
    router.replace(`/recipes${planQuery(filtersToQuery({ ...filters, ...patch }))}`, { scroll: false });
  }

  const recipes = data?.data.results ?? [];
  const showError = isError && !data;
  const countText = !data ? "Loading recipes…" : `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"}`;

  function clearFilters() {
    setResetKey((k) => k + 1);
    router.replace(`/recipes${planQuery("")}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="find something good" title="Recipes" />
      <FilterBar key={resetKey} filters={filters} onChange={update} />

      {showError ? (
        <ErrorCard error={error} onRetry={() => refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 aria-live="polite" className="text-title font-medium text-sage-deep">
              {countText}
            </h2>
            {data?.stale && <StaleNotice />}
          </div>
          {!data ? (
            <RecipesSkeleton />
          ) : recipes.length === 0 ? (
            active ? (
              <EmptyState
                illustration={<Doodle name="whisk" className="size-20 text-sage-deep" />}
                title="No recipes match"
                body="Try fewer filters, or a different search."
                action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
              />
            ) : (
              <EmptyState
                illustration={<Doodle name="whisk" className="size-20 text-sage-deep" />}
                title="Nothing here yet"
                body="No recipes yet. Check back soon."
              />
            )
          ) : (
            <div className={GRID}>
              {recipes.map((r) => (
                <MealCard key={r.id} recipe={r} size="standard" onAddToPlan={() => setPlanning({ id: r.id, title: r.title })} />
              ))}
            </div>
          )}
        </div>
      )}

      {planning && (
        <AddToPlanDialog recipe={planning} open {...planDefaults(params)} onOpenChange={(open) => !open && setPlanning(null)} />
      )}
    </div>
  );
}
