import { Minus, Plus } from "lucide-react";

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 12;

const stepper =
  "grid size-11 place-items-center rounded-full border border-line bg-card text-sage-deep transition-colors hover:border-sage " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep disabled:cursor-not-allowed disabled:opacity-50";

export function ServingsScaler({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Fewer servings"
        disabled={value <= MIN_SERVINGS}
        onClick={() => onChange(Math.max(MIN_SERVINGS, value - 1))}
        className={stepper}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <p className="min-w-16 text-center text-[0.95rem] text-ink" aria-live="polite">
        <span className="font-medium">{value}</span> {value === 1 ? "serving" : "servings"}
      </p>
      <button
        type="button"
        aria-label="More servings"
        disabled={value >= MAX_SERVINGS}
        onClick={() => onChange(Math.min(MAX_SERVINGS, value + 1))}
        className={stepper}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
