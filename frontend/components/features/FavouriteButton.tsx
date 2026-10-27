"use client";

import { Heart } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useToggleFavourite } from "@/lib/queries";
import { cn } from "@/lib/cn";

export type FavouriteButtonProps = { recipeId: number; isFavourite: boolean; className?: string; compact?: boolean };

export function FavouriteButton({ recipeId, isFavourite, className, compact = false }: FavouriteButtonProps) {
  const toggle = useToggleFavourite();
  const reduce = useReducedMotion();
  const [pops, setPops] = useState(0);

  return (
    <button
      type="button"
      aria-pressed={isFavourite}
      aria-label={isFavourite ? "Remove from favourites" : "Save to favourites"}
      onClick={() => {
        setPops((n) => n + 1);
        toggle.mutate({ recipeId, isFavourite });
      }}
      className={cn(
        "grid size-11 place-items-center rounded-full bg-card/90 text-coral-deep shadow-soft backdrop-blur-sm",
        "transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep",
        className,
      )}
    >
      <motion.span
        key={pops}
        className="grid place-items-center"
        animate={pops > 0 && !reduce ? { scale: [1, 1.25, 1] } : undefined}
        transition={{ duration: 0.25 }}
      >
        <Heart className={compact ? "size-4" : "size-5"} fill={isFavourite ? "currentColor" : "none"} aria-hidden="true" />
      </motion.span>
    </button>
  );
}
