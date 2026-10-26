import Image from "next/image";
import Link from "next/link";
import { FavouriteButton } from "@/components/features/FavouriteButton";
import type { Favourite } from "@/lib/types";

export function FavouriteCard({ favourite }: { favourite: Favourite }) {
  return (
    <article className="relative flex items-center gap-3 rounded-card border border-line bg-card p-2.5 shadow-soft transition-shadow hover:shadow-lift">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-paper">
        {favourite.image && <Image src={favourite.image} alt={favourite.title} fill sizes="96px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1 pr-11">
        <h3 className="font-display text-title font-medium text-sage-deep">
          <Link
            href={`/recipes/${favourite.recipe_id}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-card"
          >
            {favourite.title}
          </Link>
        </h3>
        {favourite.description && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{favourite.description}</p>}
      </div>
      <FavouriteButton recipeId={favourite.recipe_id} isFavourite className="absolute right-1 top-1 z-10" compact />
    </article>
  );
}
