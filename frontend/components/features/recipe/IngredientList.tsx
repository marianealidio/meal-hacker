"use client";

import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import { scaleAmount } from "@/lib/format";
import { useAddShopping } from "@/lib/queries";
import type { RecipeIngredient } from "@/lib/types";
import { ServingsScaler } from "./ServingsScaler";

function quantity(i: RecipeIngredient, base: number, servings: number): string {
  if (i.amount === null) return "";
  return [scaleAmount(i.amount, base, servings), i.unit].filter(Boolean).join(" ");
}

function shoppingName(i: RecipeIngredient): string {
  return i.amount === null && i.original.length > i.name.length ? i.original : i.name;
}

export function IngredientList({ ingredients, baseServings }: { ingredients: RecipeIngredient[]; baseServings: number }) {
  const [servings, setServings] = useState(baseServings);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const add = useAddShopping();
  const { toast } = useToast();

  const missing = ingredients.filter((i) => !i.have);
  const have = ingredients.length - missing.length;

  async function addMissing() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const results = await Promise.allSettled(
      missing.map((i) =>
        add.mutateAsync({ ingredient_name: shoppingName(i), quantity: quantity(i, baseServings, servings), aisle: i.aisle }),
      ),
    );
    inFlight.current = false;
    setBusy(false);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    // Failures already raised an error toast from useAddShopping.
    if (ok > 0) toast({ title: `Added ${ok} ${ok === 1 ? "item" : "items"} to your list` });
  }

  return (
    <Card className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-display-md text-sage-deep">Ingredients</h2>
        <ServingsScaler value={servings} onChange={setServings} />
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {ingredients.map((i, idx) => {
          const q = quantity(i, baseServings, servings);
          return (
            <li key={`${i.name}-${idx}`} className="flex items-start gap-3 py-2.5">
              {i.have ? (
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-sage-tint text-sage-deep">
                  <Check className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">You have this</span>
                </span>
              ) : (
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-coral-tint">
                  <span className="size-2 rounded-full bg-coral-deep" aria-hidden="true" />
                  <span className="sr-only">Missing</span>
                </span>
              )}
              <span className="text-[0.95rem] leading-snug text-ink">
                {i.amount === null ? (
                  i.original
                ) : (
                  <>
                    <span data-testid={`amount-${i.name}`} className="font-medium">{q}</span> {i.name}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">
        You have {have} of {ingredients.length}
      </p>
      {missing.length > 0 && (
        <Button variant="primary" pending={busy} onClick={addMissing}>
          Add {missing.length} missing to shopping list
        </Button>
      )}
    </Card>
  );
}
