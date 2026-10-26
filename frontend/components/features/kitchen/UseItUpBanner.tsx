import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { InventoryItem } from "@/lib/types";

function names(items: InventoryItem[]): string {
  const [a, b] = items;
  if (items.length === 1) return `${a.name} expires`;
  if (items.length === 2) return `${a.name} and ${b.name} expire`;
  const rest = items.length - 2;
  return `${a.name}, ${b.name} and ${rest} ${rest === 1 ? "other" : "others"} expire`;
}

/** Nudges towards recipes when anything is about to go off. Renders nothing otherwise. */
export function UseItUpBanner({ items }: { items: InventoryItem[] }) {
  const soon = items
    .filter((i) => i.days_left !== null && i.days_left <= 2)
    .sort((a, b) => (a.days_left ?? 0) - (b.days_left ?? 0));
  if (soon.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-card bg-coral-tint p-4 text-coral-tint-ink sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="flex items-start gap-3 text-[0.95rem]">
        <Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-bold">Use it up:</strong> {names(soon)} soon.
        </span>
      </p>
      <Link
        href="/recipes?matches_kitchen=1"
        className="inline-flex min-h-11 shrink-0 items-center self-start text-sm font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep sm:self-auto"
      >
        See recipes
      </Link>
    </div>
  );
}
