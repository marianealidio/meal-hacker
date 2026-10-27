import { Info } from "lucide-react";

export function StaleNotice() {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-pill bg-paper px-3 py-1.5 text-xs text-muted">
      <Info className="size-3.5 shrink-0" aria-hidden="true" />
      Showing saved recipes — live results are taking a break.
    </p>
  );
}
