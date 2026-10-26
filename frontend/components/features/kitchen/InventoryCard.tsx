"use client";

import { Check, FolderInput, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { EditItemDialog } from "@/components/features/kitchen/EditItemDialog";
import { CATEGORIES } from "@/components/features/kitchen/categories";
import { ExpiryBar } from "@/components/features/ExpiryBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/Dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { relativeExpiry, type ExpiryTone } from "@/lib/dates";
import { useDeleteInventory, useUpdateInventory, useUseInventory } from "@/lib/queries";
import type { InventoryItem } from "@/lib/types";

const TONE: Record<ExpiryTone, string> = {
  today: "text-coral-deep",
  soon: "text-butter-ink",
  fine: "text-sage-deep",
  expired: "text-coral-deep",
  none: "text-muted",
};

export function InventoryCard({ item }: { item: InventoryItem }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const update = useUpdateInventory();
  const use = useUseInventory();
  const remove = useDeleteInventory();
  const { label, tone } = relativeExpiry(item.days_left);
  const amount = [item.quantity, item.unit].filter(Boolean).join(" ");

  return (
    <Card as="article" className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words font-display text-xl font-medium text-sage-deep">{item.name}</h3>
          {amount && <p className="text-sm text-muted">{amount}</p>}
        </div>
        <Menu>
          <MenuTrigger
            aria-label={`Actions for ${item.name}`}
            className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-sage-deep transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep"
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={() => setEditing(true)}>
              <Pencil aria-hidden="true" /> Edit
            </MenuItem>
            {CATEGORIES.filter((c) => c !== item.category).map((c) => (
              <MenuItem key={c} onSelect={() => update.mutate({ id: item.id, patch: { category: c } })}>
                <FolderInput aria-hidden="true" /> Move to {c}
              </MenuItem>
            ))}
            <MenuItem onSelect={() => use.mutate(item.id)}>
              <Check aria-hidden="true" /> Mark as used
            </MenuItem>
            <MenuSeparator />
            <MenuItem tone="danger" onSelect={() => setDeleting(true)}>
              <Trash2 aria-hidden="true" /> Delete
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <div className="flex flex-col gap-2">
        <ExpiryBar daysLeft={item.days_left} />
        <p className={cn("text-sm font-medium", TONE[tone])}>{label}</p>
      </div>

      <EditItemDialog item={item} open={editing} onOpenChange={setEditing} />
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent title={`Delete ${item.name}?`} description="It will be removed from your kitchen. This can't be undone.">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                remove.mutate(item.id);
                setDeleting(false);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
