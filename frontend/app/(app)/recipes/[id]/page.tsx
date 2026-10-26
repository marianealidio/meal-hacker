"use client";

import { Clock, Users } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Doodle } from "@/components/brand/Doodle";
import { AddToPlanDialog } from "@/components/features/AddToPlanDialog";
import { ErrorCard } from "@/components/features/ErrorCard";
import { FavouriteButton } from "@/components/features/FavouriteButton";
import { StaleNotice } from "@/components/features/StaleNotice";
import { CookMode } from "@/components/features/recipe/CookMode";
import { IngredientList } from "@/components/features/recipe/IngredientList";
import { Steps } from "@/components/features/recipe/Steps";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api";
import { formatMinutes } from "@/lib/format";
import { useRecipe } from "@/lib/queries";
import type { RecipeDetail } from "@/lib/types";

function parseId(raw: string | string[] | undefined): number | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || !/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

export default function RecipeDetailPage() {
  const id = parseId(useParams<{ id: string }>().id);
  if (id === null) return <NotFound />;
  return <RecipeBody id={id} />;
}

function NotFound() {
  return (
    <EmptyState
      illustration={<Doodle name="lemon" className="size-16 text-coral-deep" />}
      title="This recipe has gone off"
      body="We couldn't find that recipe."
      action={<ButtonLink href="/recipes">Back to recipes</ButtonLink>}
    />
  );
}

function RecipeSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="aspect-video w-full rounded-card lg:aspect-[21/9]" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Skeleton className="h-96 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    </div>
  );
}

function RecipeBody({ id }: { id: number }) {
  const { data, isError, error, refetch } = useRecipe(id);
  if (isError && !data) {
    if (error instanceof ApiError && error.code === "not_found") return <NotFound />;
    return <ErrorCard error={error} onRetry={() => refetch()} />;
  }
  if (!data) return <RecipeSkeleton />;
  return <RecipeView recipe={data.data} stale={data.stale} />;
}

function RecipeView({ recipe, stale }: { recipe: RecipeDetail; stale: boolean }) {
  const [planning, setPlanning] = useState(false);
  const [cooking, setCooking] = useState(false);
  const time = formatMinutes(recipe.ready_in_minutes);

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <div className="relative aspect-video w-full overflow-hidden rounded-card bg-paper lg:aspect-[21/9]">
          {recipe.image && (
            <Image src={recipe.image} alt="" fill priority sizes="(min-width: 1024px) 1100px, 100vw" className="object-cover" />
          )}
        </div>
        {stale && <StaleNotice />}
        <div className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-display-lg text-sage-deep">{recipe.title}</h1>
          {recipe.description && <p className="text-[1.05rem] leading-relaxed text-ink">{recipe.description}</p>}
          <div className="flex flex-wrap gap-2">
            {time && <Chip icon={<Clock aria-hidden="true" />}>{time}</Chip>}
            {recipe.servings && <Chip icon={<Users aria-hidden="true" />}>{recipe.servings} servings</Chip>}
            {recipe.diets.map((d) => <Chip key={`d-${d}`}>{d}</Chip>)}
            {recipe.cuisines.map((c) => <Chip key={`c-${c}`}>{c}</Chip>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FavouriteButton recipeId={recipe.id} isFavourite={recipe.is_favourite} className="border border-line" />
          <Button onClick={() => setPlanning(true)}>Add to plan</Button>
          {recipe.steps.length > 0 && <Button variant="dark" onClick={() => setCooking(true)}>Cook mode</Button>}
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "ghost" })}
            >
              Original recipe ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div className="lg:sticky lg:top-6">
          <IngredientList ingredients={recipe.ingredients} baseServings={recipe.servings ?? 2} />
        </div>
        <Steps steps={recipe.steps} sourceUrl={recipe.source_url} />
      </div>

      <AddToPlanDialog recipe={{ id: recipe.id, title: recipe.title }} open={planning} onOpenChange={setPlanning} />
      <CookMode title={recipe.title} steps={recipe.steps} open={cooking} onOpenChange={setCooking} />
    </article>
  );
}
