"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { addDays, toISODate } from "@/lib/dates";
import { useAddInventory, useUpdateMe } from "@/lib/queries";
import { STARTERS } from "./starters";

const EXPIRY_OPTIONS = [3, 5, 7].map((n) => ({ value: String(n), label: `${n} days` }));

export function StarterPicker() {
  const router = useRouter();
  const { toast } = useToast();
  const add = useAddInventory({ quiet: true });
  const update = useUpdateMe({ quiet: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [days, setDays] = useState("5");
  const [busy, setBusy] = useState(false);

  const toggle = (name: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (!next.delete(name)) next.add(name);
      return next;
    });

  async function finish(stocked: boolean) {
    setBusy(true);
    try {
      if (stocked) {
        const expiry = toISODate(addDays(new Date(), Number(days)));
        for (const group of STARTERS) {
          for (const name of group.items) {
            if (!selected.has(name)) continue;
            await add.mutateAsync({
              name,
              category: group.category,
              ...(group.category === "Fridge" ? { expiry_date: expiry } : {}),
            });
          }
        }
      }
      await update.mutateAsync({ onboarded: true });
      if (stocked) toast({ title: "Your kitchen is stocked" });
      router.replace("/dashboard");
    } catch {
      // The mutation hooks toast the error; stay here so nothing is lost.
      setBusy(false);
    }
  }

  const count = selected.size;
  return (
    <div className="flex flex-col gap-5">
      {STARTERS.map((group) => (
        <Card as="section" key={group.category} aria-labelledby={`starter-${group.category}`} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id={`starter-${group.category}`} className="font-display text-xl text-sage-deep">
              {group.category}
            </h2>
            {group.category === "Fridge" && (
              <SelectField
                label="Expires in"
                name="expires_in"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                options={EXPIRY_OPTIONS}
                className="w-36"
              />
            )}
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {group.items.map((name) => {
              const on = selected.has(name);
              return (
                <li key={name}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(name)}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-pill border px-4 text-sm font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep",
                      on ? "border-sage-deep bg-sage-deep text-cream" : "border-line bg-paper text-sage-deep hover:bg-sage-tint",
                    )}
                  >
                    {name}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={count === 0} pending={busy && count > 0} onClick={() => finish(true)}>
          Add {count} {count === 1 ? "ingredient" : "ingredients"}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => finish(false)}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
