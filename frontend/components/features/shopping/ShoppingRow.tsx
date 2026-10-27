"use client";

import { Refrigerator, Trash2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { ShoppingItem } from "@/lib/types";

export const checkboxId = (id: number) => `shopping-check-${id}`;

export type ShoppingRowProps = {
  item: ShoppingItem;
  onToggle: (item: ShoppingItem, checked: boolean) => void;
  onMove: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
};

const iconButton =
  "grid size-11 shrink-0 place-items-center rounded-full text-sage-deep transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep";

export function ShoppingRow({ item, onToggle, onMove, onDelete }: ShoppingRowProps) {
  const reduced = useReducedMotion();
  const name = item.ingredient_name;
  const label = `${name} ${item.quantity}`.trim();

  return (
    <li className="flex items-start gap-1 py-0.5">
      <div className="min-w-0 flex-1">
        <label className="group flex min-h-11 cursor-pointer items-center gap-3">
          <input
            id={checkboxId(item.id)}
            type="checkbox"
            checked={item.checked}
            onChange={(e) => onToggle(item, e.target.checked)}
            aria-label={label}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            data-checked={item.checked}
            className={cn(
              "shop-box grid size-7 shrink-0 place-items-center rounded-lg border-2 transition-colors",
              "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-coral-deep",
              item.checked ? "border-sage-deep bg-sage-deep text-cream" : "border-sage-deep bg-card text-transparent",
            )}
          >
            <svg viewBox="0 0 24 24" className="size-5 shop-tick" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              {item.checked && (
                <path
                  d="M5 12.5l4.5 4.5L19 7"
                  pathLength={1}
                  strokeDasharray={1}
                  className={reduced ? undefined : "animate-[mh-draw_280ms_ease-out_both]"}
                />
              )}
            </svg>
          </span>
          <span className={cn("min-w-0 break-words text-[0.95rem]", item.checked ? "text-muted line-through" : "text-ink")}>
            {name}
            {item.quantity && <span className="text-muted"> {item.quantity}</span>}
          </span>
        </label>
        {item.source === "auto" && (
          <Badge className="-mt-1 mb-1 ml-10 border-transparent bg-sage-tint text-sage-deep">
            from your plan
          </Badge>
        )}
      </div>
      <div data-print="hide" className="flex shrink-0">
        <button type="button" aria-label={`Move ${name} to your kitchen`} onClick={() => onMove(item)} className={iconButton}>
          <Refrigerator className="size-5" aria-hidden="true" />
        </button>
        <button type="button" aria-label={`Delete ${name}`} onClick={() => onDelete(item)} className={iconButton}>
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
