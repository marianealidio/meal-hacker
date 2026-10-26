"use client";

import { Printer, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Doodle } from "@/components/brand/Doodle";
import { ErrorCard } from "@/components/features/ErrorCard";
import { PageHeader } from "@/components/features/PageHeader";
import { AddShoppingItem } from "@/components/features/shopping/AddShoppingItem";
import { MoveToKitchenDialog } from "@/components/features/shopping/MoveToKitchenDialog";
import { ShoppingGroup } from "@/components/features/shopping/ShoppingGroup";
import { checkboxId } from "@/components/features/shopping/ShoppingRow";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toaster";
import { useClearChecked, useDeleteShopping, useShopping, useUpdateShopping } from "@/lib/queries";
import type { ShoppingItem } from "@/lib/types";

const OTHER = "Other";

type Group = { title: string; items: ShoppingItem[] };

function groupByAisle(items: ShoppingItem[]): Group[] {
  const byAisle = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const aisle = item.aisle.trim() || OTHER;
    byAisle.set(aisle, [...(byAisle.get(aisle) ?? []), item]);
  }
  return [...byAisle.entries()]
    .sort(([a], [b]) => (a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b)))
    .map(([title, list]) => ({ title, items: list }));
}

/**
 * Where focus should go once the list has re-rendered. `gone` waits for the item to leave the list
 * and then focuses its neighbour; `keep` refocuses a row's checkbox after it moves between groups.
 */
type FocusRequest = { kind: "gone"; id: number; next: number | null } | { kind: "keep"; id: number };

export default function ShoppingPage() {
  const { data, isPending, isError, error, refetch } = useShopping();
  const update = useUpdateShopping();
  const remove = useDeleteShopping();
  const clear = useClearChecked();
  const { toast } = useToast();
  const [moving, setMoving] = useState<ShoppingItem | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const focusRequest = useRef<FocusRequest | null>(null);
  const lastMoving = useRef<number | null>(null);

  const items = useMemo(() => data ?? [], [data]);
  const { groups, basket, order } = useMemo(() => {
    const open = groupByAisle(items.filter((i) => !i.checked));
    const done = items.filter((i) => i.checked);
    return { groups: open, basket: done, order: [...open.flatMap((g) => g.items), ...done].map((i) => i.id) };
  }, [items]);

  useEffect(() => {
    const req = focusRequest.current;
    if (!req) return;
    const present = items.some((i) => i.id === req.id);
    if (req.kind === "keep") {
      focusRequest.current = null;
      if (present) document.getElementById(checkboxId(req.id))?.focus();
    } else if (!present) {
      focusRequest.current = null;
      const next = req.next === null ? null : document.getElementById(checkboxId(req.next));
      (next ?? addRef.current)?.focus();
    }
  }, [items]);

  const requestGone = useCallback(
    (id: number) => {
      const at = order.indexOf(id);
      focusRequest.current = { kind: "gone", id, next: order[at + 1] ?? order[at - 1] ?? null };
    },
    [order],
  );

  const openMove = useCallback((item: ShoppingItem) => {
    lastMoving.current = item.id;
    setMoving(item);
  }, []);

  function toggle(item: ShoppingItem, checked: boolean) {
    focusRequest.current = { kind: "keep", id: item.id };
    update.mutate(
      { id: item.id, patch: { checked } },
      {
        onSuccess: () => {
          if (checked) {
            toast({ title: `${item.ingredient_name} ticked`, action: { label: "Move to kitchen", onClick: () => openMove(item) } });
          }
        },
      },
    );
  }

  function destroy(item: ShoppingItem) {
    requestGone(item.id);
    remove.mutate(item.id);
  }

  function clearTicked() {
    clear.mutate(undefined, {
      onSuccess: ({ deleted }) => {
        toast({ title: `Cleared ${deleted} ${deleted === 1 ? "item" : "items"}` });
        addRef.current?.focus();
      },
    });
  }

  function afterMoveClosed() {
    const id = lastMoving.current;
    if (focusRequest.current || id === null) return;
    if (document.activeElement && document.activeElement !== document.body) return;
    document.getElementById(checkboxId(id))?.focus();
  }

  const handlers = { onToggle: toggle, onMove: openMove, onDelete: destroy };
  const anyChecked = basket.length > 0;

  return (
    <div className="flex flex-col gap-6" data-shopping>
      <PageHeader
        kicker="tick, done, stored"
        title="Shopping list"
        actions={
          <div data-print="hide" className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              Print
            </Button>
            {anyChecked && (
              <Button variant="ghost" onClick={clearTicked} pending={clear.isPending}>
                <Trash2 className="size-4" aria-hidden="true" />
                Clear ticked
              </Button>
            )}
          </div>
        }
      />
      <AddShoppingItem inputRef={addRef} />

      {isError && !data ? (
        <ErrorCard error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          illustration={<Doodle name="lemon" className="size-16 text-sage-deep" />}
          title="Your list is empty"
          body="Add items here, or add a recipe to your plan and we'll list what's missing."
          action={<ButtonLink href="/recipes">Browse recipes</ButtonLink>}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {groups.map((g) => (
            <ShoppingGroup key={g.title} id={`aisle-${g.title.replace(/\W+/g, "-")}`} title={g.title} items={g.items} {...handlers} />
          ))}
          {anyChecked && <ShoppingGroup id="aisle-basket" title="In the basket" items={basket} {...handlers} />}
        </div>
      )}

      <MoveToKitchenDialog
        item={moving}
        onClose={() => setMoving(null)}
        onMoved={(item) => {
          requestGone(item.id);
          setMoving(null);
        }}
        onClosed={afterMoveClosed}
      />
    </div>
  );
}
