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
import { filtersFromParams, filtersToQuery } from "@/components/features/recipes/filters";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SearchParams } from "@/lib/api";
import { useSearch } from "@/lib/queries";

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
  const { data, isPending, isError, error, refetch } = useSearch(filters);
  const [planning, setPlanning] = useState<{ id: number; title: string } | null>(null);

  function update(patch: SearchParams) {
    router.replace(`/recipes${filtersToQuery({ ...filters, ...patch })}`, { scroll: false });
  }

  const recipes = data?.data.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="find something good" title="Recipes" />
      <FilterBar filters={filters} onChange={update} />

      {isError && !data ? (
        <ErrorCard error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <RecipesSkeleton />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 aria-live="polite" className="text-title font-medium text-sage-deep">
              {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
            </h2>
            {data.stale && <StaleNotice />}
          </div>
          {recipes.length === 0 ? (
            <EmptyState
              illustration={<Doodle name="whisk" className="size-20 text-sage-deep" />}
              title="No recipes match"
              body="Try fewer filters, or a different search."
              action={<Button variant="secondary" onClick={() => router.replace("/recipes", { scroll: false })}>Clear filters</Button>}
            />
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
        <AddToPlanDialog recipe={planning} open onOpenChange={(open) => !open && setPlanning(null)} />
      )}
    </div>
  );
}
