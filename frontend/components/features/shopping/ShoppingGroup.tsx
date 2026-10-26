import { Card } from "@/components/ui/Card";
import { ShoppingRow, type ShoppingRowProps } from "./ShoppingRow";
import type { ShoppingItem } from "@/lib/types";

export type ShoppingGroupProps = Omit<ShoppingRowProps, "item"> & { id: string; title: string; items: ShoppingItem[] };

export function ShoppingGroup({ id, title, items, ...handlers }: ShoppingGroupProps) {
  return (
    <Card as="section" aria-labelledby={id} className="shop-group p-4 sm:p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-title text-sage-deep">
          {title}
        </h2>
        <span className="shop-count text-sm text-muted" aria-hidden="true">
          {items.length}
        </span>
      </div>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <ShoppingRow key={item.id} item={item} {...handlers} />
        ))}
      </ul>
    </Card>
  );
}
