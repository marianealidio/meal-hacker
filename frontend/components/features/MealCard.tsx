import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { formatMinutes } from "@/lib/format";
import type { RecipeSummary } from "@/lib/types";
import { FavouriteButton } from "./FavouriteButton";

export type MealCardProps = {
  recipe: RecipeSummary;
  size: "hero" | "standard" | "compact";
  onAddToPlan?: () => void;
};

export function MealCard({ recipe, size, onAddToPlan }: MealCardProps) {
  const compact = size === "compact";
  const hero = size === "hero";
  const time = formatMinutes(recipe.ready_in_minutes);
  const sizes = hero ? "(min-width: 1024px) 480px, 100vw" : compact ? "96px" : "(min-width: 1024px) 320px, 50vw";

  const image = (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-paper",
        compact ? "size-24 rounded-2xl" : cn("w-full rounded-arch", hero ? "aspect-[4/3]" : "aspect-[4/5]"),
      )}
    >
      {recipe.image && <Image src={recipe.image} alt={recipe.title} fill sizes={sizes} className="object-cover" />}
      <FavouriteButton
        recipeId={recipe.id}
        isFavourite={recipe.is_favourite}
        className={cn("absolute right-2 top-2 z-10", compact && "size-11 scale-[0.8] origin-top-right")}
      />
    </div>
  );

  const title = (
    <h3 className={cn("font-display font-medium text-sage-deep", hero ? "text-display-md" : "text-title")}>
      <Link href={`/recipes/${recipe.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-card">
        {recipe.title}
      </Link>
    </h3>
  );

  if (compact) {
    return (
      <article className="relative flex items-center gap-3 rounded-card border border-line bg-card p-2.5 shadow-soft">
        {image}
        <div className="min-w-0 flex-1">
          {title}
          {time && <Chip className="mt-2">{time}</Chip>}
        </div>
      </article>
    );
  }

  return (
    <article className="relative flex flex-col gap-4 rounded-card border border-line bg-card p-3 shadow-soft transition-shadow hover:shadow-lift">
      {image}
      <div className="flex flex-1 flex-col gap-2 px-1 pb-1">
        {hero && <p className="font-script text-[1.5rem] leading-none text-coral-deep">tonight&rsquo;s pick</p>}
        {title}
        {recipe.description && (
          <p className={cn("text-sm leading-relaxed text-muted", hero ? "line-clamp-3" : "line-clamp-2")}>
            {recipe.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {time && <Chip>{time}</Chip>}
          {recipe.servings != null && <Chip>Serves {recipe.servings}</Chip>}
          {recipe.diets[0] && <Chip>{recipe.diets[0]}</Chip>}
          {recipe.used.length > 0 && <Chip tone="have">uses {recipe.used.length}</Chip>}
          {recipe.missing.length > 0 && <Chip tone="missing">missing {recipe.missing.length}</Chip>}
          {recipe.uses_expiring && recipe.uses_expiring.length > 0 && (
            <Chip tone="soon">uses your {recipe.uses_expiring[0]}</Chip>
          )}
        </div>
        {hero && onAddToPlan && (
          <Button variant="dark" className="relative z-10 mt-2 self-start" onClick={onAddToPlan}>
            Add to plan
          </Button>
        )}
      </div>
    </article>
  );
}
