"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { useAddShopping } from "@/lib/queries";

const control =
  "h-11 w-full rounded-xl border border-line bg-card px-4 text-[0.95rem] text-ink placeholder:text-muted transition-[border-color] hover:border-sage/60 " +
  "focus-visible:border-coral-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep aria-invalid:border-coral-deep";

export function AddShoppingItem({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const add = useAddShopping();

  function submit(e: FormEvent) {
    e.preventDefault();
    const ingredient_name = name.trim();
    if (!ingredient_name) {
      setError("Type what you need first.");
      inputRef.current?.focus();
      return;
    }
    setError("");
    const qty = quantity.trim();
    add.mutate(
      { ingredient_name, ...(qty ? { quantity: qty } : {}) },
      {
        onSuccess: () => {
          setName("");
          setQuantity("");
          inputRef.current?.focus();
        },
        onError: (err) => {
          if (err instanceof ApiError) setError(err.fields.ingredient_name?.[0] ?? "");
        },
      },
    );
  }

  return (
    <form
      data-print="hide"
      onSubmit={submit}
      noValidate
      className="grid grid-cols-[1fr_6.5rem] items-end gap-3 sm:grid-cols-[1fr_9rem_auto]"
    >
      <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
        <label htmlFor="shopping-add-name" className="text-sm font-medium text-sage-deep">
          Add an item
        </label>
        <input
          ref={inputRef}
          id="shopping-add-name"
          name="ingredient_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lemons"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "shopping-add-error" : undefined}
          className={control}
        />
        {error && (
          <p id="shopping-add-error" role="alert" className="text-xs font-medium text-coral-deep">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="shopping-add-qty" className="text-sm font-medium text-sage-deep">
          Quantity
        </label>
        <input
          id="shopping-add-qty"
          name="quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="optional"
          autoComplete="off"
          className={control}
        />
      </div>
      <Button type="submit" pending={add.isPending}>
        <Plus className="size-4" aria-hidden="true" />
        Add
      </Button>
    </form>
  );
}
