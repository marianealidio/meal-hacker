"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { CATEGORIES } from "@/components/features/kitchen/categories";
import { useShoppingToInventory } from "@/lib/queries";
import type { Category, ShoppingItem } from "@/lib/types";

const OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));

function guessCategory(aisle: string): Category {
  if (/frozen|freezer/i.test(aisle)) return "Freezer";
  if (/dairy|meat|fish|produce|veg|fruit|chill|fridge|deli/i.test(aisle)) return "Fridge";
  return "Pantry";
}

function Form({ item, onMoved, onCancel }: { item: ShoppingItem; onMoved: () => void; onCancel: () => void }) {
  const [category, setCategory] = useState<Category>(guessCategory(item.aisle));
  const [expiry, setExpiry] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const move = useShoppingToInventory();

  function submit(e: FormEvent) {
    e.preventDefault();
    setFields({});
    move.mutate(
      { id: item.id, category, expiry_date: expiry || null },
      { onSuccess: onMoved, onError: (err) => err instanceof ApiError && setFields(err.fields) },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <SelectField
        label="Category"
        name="category"
        value={category}
        onChange={(e) => setCategory(e.target.value as Category)}
        options={OPTIONS}
        error={fields.category?.[0]}
      />
      <TextField
        label="Expiry"
        name="expiry_date"
        type="date"
        hint="Optional. We'll keep an eye on it."
        value={expiry}
        onChange={(e) => setExpiry(e.target.value)}
        error={fields.expiry_date?.[0]}
      />
      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" pending={move.isPending}>
          Move
        </Button>
      </div>
    </form>
  );
}

export type MoveToKitchenDialogProps = {
  item: ShoppingItem | null;
  onMoved: (item: ShoppingItem) => void;
  onClose: () => void;
  /** Runs after the dialog has closed, so the caller can place focus. */
  onClosed: () => void;
};

export function MoveToKitchenDialog({ item, onMoved, onClose, onClosed }: MoveToKitchenDialogProps) {
  return (
    <Dialog open={item !== null} onOpenChange={(o) => !o && onClose()}>
      {item && (
        <DialogContent
          title={`Move ${item.ingredient_name} to your kitchen`}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            onClosed();
          }}
        >
          <Form key={item.id} item={item} onMoved={() => onMoved(item)} onCancel={onClose} />
        </DialogContent>
      )}
    </Dialog>
  );
}
