"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { CATEGORIES } from "@/components/features/kitchen/categories";
import { useUpdateInventory } from "@/lib/queries";
import type { Category, InventoryItem } from "@/lib/types";

const OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));

function Form({ item, onDone }: { item: InventoryItem; onDone: () => void }) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [category, setCategory] = useState<Category>(item.category);
  const [expiry, setExpiry] = useState(item.expiry_date ?? "");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const update = useUpdateInventory();

  function submit(e: FormEvent) {
    e.preventDefault();
    setFields({});
    update.mutate(
      { id: item.id, patch: { name: name.trim(), quantity: quantity.trim(), category, expiry_date: expiry || null } },
      {
        onSuccess: onDone,
        onError: (err) => err instanceof ApiError && setFields(err.fields),
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <TextField label="Name" name="name" value={name} onChange={(e) => setName(e.target.value)} error={fields.name?.[0]} />
      <TextField label="Quantity" name="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} error={fields.quantity?.[0]} />
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
        value={expiry}
        onChange={(e) => setExpiry(e.target.value)}
        error={fields.expiry_date?.[0]}
      />
      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" pending={update.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}

export function EditItemDialog({ item, open, onOpenChange }: { item: InventoryItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Edit ${item.name}`}>
        <Form item={item} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
