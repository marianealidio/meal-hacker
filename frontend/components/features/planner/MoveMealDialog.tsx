"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { useUpdatePlan } from "@/lib/queries";
import type { MealPlan, Slot } from "@/lib/types";

export const SLOTS: { value: Slot; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

export type MoveMealDialogProps = { meal: MealPlan; open: boolean; onOpenChange: (open: boolean) => void };

export function MoveMealDialog({ meal, open, onOpenChange }: MoveMealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Move meal" description={meal.recipe_title}>
        <MoveForm meal={meal} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function MoveForm({ meal, onDone }: { meal: MealPlan; onDone: () => void }) {
  const [date, setDate] = useState(meal.planned_date);
  const [slot, setSlot] = useState<Slot>(meal.slot);
  const update = useUpdatePlan();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!date) return;
    if (date === meal.planned_date && slot === meal.slot) return onDone();
    // The pill may leave this day's list straight away, so close first. Failures are toasted by the hook.
    update.mutate({ id: meal.id, patch: { planned_date: date, slot } });
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <TextField label="Date" name="planned_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <SelectField label="Meal" name="slot" value={slot} onChange={(e) => setSlot(e.target.value as Slot)} options={SLOTS} />
      <Button type="submit" className="self-start">
        Move meal
      </Button>
    </form>
  );
}
