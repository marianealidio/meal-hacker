"use client";

import { Doodle } from "@/components/brand/Doodle";
import { ErrorCard } from "@/components/features/ErrorCard";
import { PageHeader } from "@/components/features/PageHeader";
import { FavouriteCard } from "@/components/features/recipes/FavouriteCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFavourites } from "@/lib/queries";

const GRID = "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";

export default function FavouritesPage() {
  const { data, isPending, isError, error, refetch } = useFavourites();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="the keepers" title="Favourites" />
      {isError && !data ? (
        <ErrorCard error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div aria-busy="true" className={GRID}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          illustration={<Doodle name="heart" className="size-20 text-coral-deep" />}
          title="No favourites yet"
          body="Tap the heart on any recipe to keep it here."
          action={
            <ButtonLink href="/recipes">Browse recipes</ButtonLink>
          }
        />
      ) : (
        <div className={GRID}>
          {data.map((f) => (
            <FavouriteCard key={f.recipe_id} favourite={f} />
          ))}
        </div>
      )}
    </div>
  );
}
