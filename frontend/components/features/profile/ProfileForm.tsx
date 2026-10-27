"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { useUpdateMe } from "@/lib/queries";
import { cn } from "@/lib/cn";
import type { Me } from "@/lib/types";
import { DIET_OPTIONS, INTOLERANCE_OPTIONS } from "./options";

export function ProfileForm({ me }: { me: Me }) {
  const update = useUpdateMe();
  const [name, setName] = useState(me.display_name);
  const [diet, setDiet] = useState(me.diet);
  const [intolerances, setIntolerances] = useState<string[]>(me.intolerances);

  const toggle = (value: string) =>
    setIntolerances((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]));

  return (
    <Card as="section" aria-labelledby="prefs-title" className="p-5 sm:p-6">
      <h2 id="prefs-title" className="font-display text-xl text-sage-deep">
        Preferences
      </h2>
      <form
        className="mt-4 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({ display_name: name.trim(), diet, intolerances: INTOLERANCE_OPTIONS.map((o) => o.value).filter((v) => intolerances.includes(v)) });
        }}
      >
        <TextField label="Display name" name="display_name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
        <SelectField label="Diet" name="diet" value={diet} onChange={(e) => setDiet(e.target.value)} options={DIET_OPTIONS} />
        <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby="prefs-hint">
          <legend className="mb-2 text-sm font-medium text-sage-deep">Intolerances</legend>
          <div className="flex flex-wrap gap-2">
            {INTOLERANCE_OPTIONS.map((o) => {
              const on = intolerances.includes(o.value);
              return (
                <label key={o.value} className="relative cursor-pointer">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(o.value)}
                    className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                    aria-label={o.label}
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-pill border px-4 text-sm font-medium transition-colors",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-coral-deep",
                      on ? "border-sage-deep bg-sage-deep text-cream" : "border-line bg-paper text-sage-deep hover:bg-sage-tint",
                    )}
                  >
                    {o.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <p id="prefs-hint" className="text-sm text-muted">
          Diet applies to every suggestion and search. Intolerances apply to recipe search.
        </p>
        <div>
          <Button type="submit" pending={update.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}
