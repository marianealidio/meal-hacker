"use client";

import { MoreHorizontal, Move, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toaster";
import { useDeletePlan } from "@/lib/queries";
import type { MealPlan } from "@/lib/types";
import { MoveMealDialog } from "./MoveMealDialog";

export function MealPill({ meal }: { meal: MealPlan }) {
  const [moving, setMoving] = useState(false);
  const remove = useDeletePlan();
  const { toast } = useToast();

  // The pill unmounts as soon as the optimistic delete lands, so the toast can't hang off mutate callbacks.
  function removeMeal() {
    remove
      .mutateAsync(meal.id)
      .then(() => toast({ title: "Removed from your plan" }))
      .catch(() => {});
  }

  // From lg up the seven columns are narrow: the title drops under the thumbnail and menu instead of being squeezed to nothing.
  return (
    <li className="flex items-center gap-2 rounded-2xl bg-cream py-1.5 pl-1.5 pr-0.5 lg:grid lg:grid-cols-[auto_1fr] lg:gap-x-1 lg:gap-y-1 lg:pb-2.5">
      <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-paper">
        {meal.recipe_image && <Image src={meal.recipe_image} alt="" fill sizes="44px" className="object-cover" />}
      </span>
      <Link
        href={`/recipes/${meal.recipe_id}`}
        className="line-clamp-2 min-w-0 flex-1 break-words rounded text-sm lg:col-span-2 lg:row-start-2 lg:pr-2 font-medium leading-snug text-sage-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep"
      >
        {meal.recipe_title}
      </Link>
      <Menu>
        <MenuTrigger
          aria-label={`Actions for ${meal.recipe_title}`}
          className="grid size-11 shrink-0 place-items-center rounded-full text-sage-deep lg:col-start-2 lg:row-start-1 lg:justify-self-end transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => setMoving(true)}>
            <Move aria-hidden="true" /> Move…
          </MenuItem>
          <MenuItem tone="danger" onSelect={removeMeal}>
            <Trash2 aria-hidden="true" /> Remove
          </MenuItem>
        </MenuContent>
      </Menu>
      <MoveMealDialog meal={meal} open={moving} onOpenChange={setMoving} />
    </li>
  );
}
