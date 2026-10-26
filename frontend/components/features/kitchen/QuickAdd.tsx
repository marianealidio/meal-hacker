"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { CATEGORIES } from "@/components/features/kitchen/categories";
import { useAddInventory } from "@/lib/queries";
import type { Category } from "@/lib/types";

export type QuickAddProps = {
  category: Category;
  onCategoryChange: (c: Category) => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

const OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));

export function QuickAdd({ category, onCategoryChange, inputRef }: QuickAddProps) {
  const [text, setText] = useState("");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState("");
  const add = useAddInventory();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    add.mutate(
      { text: text.trim(), category, ...(expiry ? { expiry_date: expiry } : {}) },
      {
        onSuccess: () => {
          setText("");
          setExpiry("");
          inputRef.current?.focus();
        },
        onError: (err) => {
          if (err instanceof ApiError) setError(err.fields.name?.[0] ?? err.fields.text?.[0] ?? "");
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[1fr_9rem_10rem_auto]" noValidate>
      <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
        <label htmlFor="quick-add-text" className="sr-only">
          Add an ingredient
        </label>
        <div className="flex h-11 items-center gap-2 rounded-pill border border-line bg-card pl-4 pr-2 shadow-soft focus-within:border-coral-deep focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-coral-deep aria-[invalid=true]:border-coral-deep">
          <Plus className="size-5 shrink-0 text-coral-deep" aria-hidden="true" />
          <input
            ref={inputRef}
            id="quick-add-text"
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="2 red peppers"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "quick-add-error" : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-muted"
          />
        </div>
        {error && (
          <p id="quick-add-error" role="alert" className="pl-4 text-xs font-medium text-coral-deep">
            {error}
          </p>
        )}
      </div>
      <SelectField
        label="Category"
        name="category"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value as Category)}
        options={OPTIONS}
      />
      <TextField label="Expiry" name="expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
      <Button type="submit" pending={add.isPending} className="col-span-2 lg:col-span-1">
        Add
      </Button>
    </form>
  );
}
