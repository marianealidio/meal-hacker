"use client";

import { Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Doodle } from "@/components/brand/Doodle";
import { ErrorCard } from "@/components/features/ErrorCard";
import { PageHeader } from "@/components/features/PageHeader";
import { InventoryCard } from "@/components/features/kitchen/InventoryCard";
import { QuickAdd } from "@/components/features/kitchen/QuickAdd";
import { UseItUpBanner } from "@/components/features/kitchen/UseItUpBanner";
import { CATEGORIES } from "@/components/features/kitchen/categories";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useInventory } from "@/lib/queries";
import type { Category, InventoryItem } from "@/lib/types";

type Sort = "expiry" | "az";
const SORTS = [
  { value: "expiry", label: "Expiring first" },
  { value: "az", label: "A–Z" },
];

function sortItems(items: InventoryItem[], sort: Sort): InventoryItem[] {
  const copy = [...items];
  if (sort === "az") return copy.sort((a, b) => a.name.localeCompare(b.name));
  return copy.sort((a, b) => (a.days_left ?? Infinity) - (b.days_left ?? Infinity) || a.name.localeCompare(b.name));
}

export default function KitchenPage() {
  const { data, isPending, isError, error, refetch } = useInventory();
  const [tab, setTab] = useState<Category>("Fridge");
  const [addCategory, setAddCategory] = useState<Category>("Fridge");
  const [sort, setSort] = useState<Sort>("expiry");
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => data ?? [], [data]);
  const counts = useMemo(
    () => Object.fromEntries(CATEGORIES.map((c) => [c, items.filter((i) => i.category === c).length])) as Record<Category, number>,
    [items],
  );
  const visible = useMemo(() => sortItems(items.filter((i) => i.category === tab), sort), [items, tab, sort]);

  function focusAdd(category: Category) {
    setAddCategory(category);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="what's in the cupboards" title="Your kitchen" />
      <QuickAdd category={addCategory} onCategoryChange={setAddCategory} inputRef={inputRef} />

      {isError && !data ? (
        <ErrorCard error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <UseItUpBanner items={items} />
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as Category);
              setAddCategory(v as Category);
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <TabsList aria-label="Where it's kept" className="sm:min-w-0 sm:flex-1">
                {CATEGORIES.map((c) => (
                  <TabsTrigger key={c} value={c}>
                    {c}{" "}
                    <span className="rounded-pill bg-paper px-2 py-0.5 text-xs text-sage-deep">{isPending ? "–" : counts[c]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <SelectField
                label="Sort"
                name="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                options={SORTS}
                className="sm:w-48"
              />
            </div>
            <TabsContent value={tab}>
              {isPending ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-36" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <EmptyState
                  illustration={<Doodle name="leaf" className="size-16 text-sage-deep" />}
                  title={`Your ${tab} is empty`}
                  body="Add what you've got and we'll keep an eye on the dates."
                  action={<Button onClick={() => focusAdd(tab)}>Add something</Button>}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {visible.map((item) => (
                    <InventoryCard key={item.id} item={item} />
                  ))}
                  <button
                    type="button"
                    onClick={() => focusAdd(tab)}
                    className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line p-5 text-sage-deep transition-colors hover:border-sage hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep"
                  >
                    <Plus className="size-6 text-coral-deep" aria-hidden="true" />
                    <span className="font-display text-lg">Add to {tab}</span>
                  </button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
