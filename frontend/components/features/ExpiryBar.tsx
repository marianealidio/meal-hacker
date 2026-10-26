import { cn } from "@/lib/cn";

/** Fill length and colour for a days-left value. The label sits next to it, so the bar is decorative. */
export function ExpiryBar({ daysLeft }: { daysLeft: number | null }) {
  const pct = daysLeft === null ? 100 : Math.min(100, Math.max(8, 100 - daysLeft * 10));
  const tone =
    daysLeft === null ? "bg-line" : daysLeft <= 0 ? "bg-coral" : daysLeft <= 3 ? "bg-butter" : "bg-sage";
  return (
    <div aria-hidden="true" className="h-[5px] w-full overflow-hidden rounded-pill bg-line/60">
      <div className={cn("h-full rounded-pill", tone)} style={{ width: `${pct}%` }} />
    </div>
  );
}
