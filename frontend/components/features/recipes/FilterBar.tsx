"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SelectField, TextField } from "@/components/ui/Field";
import type { SearchParams } from "@/lib/api";
import { cn } from "@/lib/cn";
import { CUISINES, DIETS, TYPES } from "./filters";

const DEBOUNCE_MS = 400;
const ANY = { value: "", label: "Any" };

export type FilterBarProps = { filters: SearchParams; onChange: (patch: SearchParams) => void };

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const urlQ = filters.q ?? "";
  const [text, setText] = useState(urlQ);
  // The last value this bar pushed to the URL, so its own round trip doesn't overwrite newer typing.
  const pushed = useRef(urlQ);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (urlQ !== pushed.current) {
      pushed.current = urlQ;
      setText(urlQ);
    }
  }, [urlQ]);

  useEffect(() => {
    const value = text.trim();
    if (value === pushed.current) return;
    const id = setTimeout(() => {
      pushed.current = value;
      onChangeRef.current({ q: value });
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text]);

  return (
    <div
      role="search"
      className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b border-line bg-cream/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
    >
      <div className="relative">
        <TextField
          label="Search recipes"
          name="q"
          type="search"
          placeholder="Soup, pasta, curry…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="[&_input]:pl-11"
        />
        <Search aria-hidden="true" className="pointer-events-none absolute bottom-3.5 left-4 size-4 text-sage-deep" />
      </div>

      <div role="group" aria-label="Meal type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {TYPES.map((t) => {
          const on = filters.type === t.value;
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ type: on ? "" : t.value })}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-pill border-[1.5px] px-4 text-[0.95rem] font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep",
                on ? "border-sage-deep bg-sage-deep text-cream" : "border-line bg-card text-sage-deep hover:border-sage",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
        <SelectField
          label="Cuisine"
          name="cuisine"
          value={filters.cuisine ?? ""}
          onChange={(e) => onChange({ cuisine: e.target.value })}
          options={[ANY, ...CUISINES]}
        />
        <SelectField
          label="Diet"
          name="diet"
          value={filters.diet ?? ""}
          onChange={(e) => onChange({ diet: e.target.value })}
          options={[ANY, ...DIETS]}
        />
        <KitchenSwitch
          checked={Boolean(filters.matches_kitchen)}
          onChange={(v) => onChange({ matches_kitchen: v })}
          className="col-span-2 md:col-span-1"
        />
      </div>
    </div>
  );
}

function KitchenSwitch({ checked, onChange, className }: { checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex min-h-11 items-center gap-3 rounded-pill text-[0.95rem] font-medium text-sage-deep",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("relative h-7 w-12 shrink-0 rounded-pill border border-line transition-colors", checked ? "bg-sage-deep" : "bg-paper")}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-card shadow-soft transition-transform motion-reduce:transition-none",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </span>
      Matches my kitchen
    </button>
  );
}
