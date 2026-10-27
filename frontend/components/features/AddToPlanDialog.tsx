"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { toISODate } from "@/lib/dates";
import { useAddPlan } from "@/lib/queries";
import type { Slot } from "@/lib/types";

const SLOTS: { value: Slot; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

export type AddToPlanDialogProps = {
  recipe: { id: number; title: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultSlot?: Slot;
};

export function AddToPlanDialog({ recipe, open, onOpenChange, defaultDate, defaultSlot }: AddToPlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add to plan" description={recipe.title}>
        <PlanForm recipe={recipe} defaultDate={defaultDate} defaultSlot={defaultSlot} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

type FormProps = { recipe: { id: number }; defaultDate?: string; defaultSlot?: Slot; onDone: () => void };

function PlanForm({ recipe, defaultDate, defaultSlot, onDone }: FormProps) {
  const [date, setDate] = useState(() => defaultDate ?? toISODate(new Date()));
  const [slot, setSlot] = useState<Slot>(defaultSlot ?? "dinner");
  const [addMissing, setAddMissing] = useState(true);
  const add = useAddPlan();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!date) return;
    add.mutate({ recipe_id: recipe.id, planned_date: date, slot, add_missing: addMissing }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <TextField label="Date" name="planned_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-sage-deep">Meal</legend>
        <div className="flex flex-wrap gap-2">
          {SLOTS.map((s) => (
            <label
              key={s.value}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center rounded-pill border-[1.5px] px-5 text-[0.95rem] font-medium transition-colors",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-coral-deep",
                slot === s.value ? "border-sage-deep bg-sage-deep text-cream" : "border-line bg-card text-sage-deep hover:border-sage",
              )}
            >
              <input
                type="radio"
                name="slot"
                value={s.value}
                checked={slot === s.value}
                onChange={() => setSlot(s.value)}
                className="sr-only"
              />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[0.95rem] text-ink">
        <input
          type="checkbox"
          checked={addMissing}
          onChange={(e) => setAddMissing(e.target.checked)}
          className="size-5 shrink-0 accent-sage-deep"
        />
        Add missing ingredients to my shopping list
      </label>
      <Button type="submit" pending={add.isPending} className="self-start">
        Add to plan
      </Button>
    </form>
  );
}
