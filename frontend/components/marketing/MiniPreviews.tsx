import { Clock, Hand, Heart, Plus, Send } from "lucide-react";
import type { ReactNode } from "react";
import { ArchImage } from "@/components/brand/ArchImage";
import { LogoMark } from "@/components/brand/Logo";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";

/*
 * Static, hand-built miniatures of the app screens. They are decorative: FeatureRow
 * wraps each one in role="img" with a summary label and hides the insides.
 */
function Frame({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[28px] border border-line bg-card p-4 shadow-lift sm:p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <LogoMark className="size-6" />
          <span className="font-display text-[0.95rem] text-sage-deep">{title}</span>
        </span>
        <span className="flex gap-1">
          <span className="size-1.5 rounded-full bg-line" />
          <span className="size-1.5 rounded-full bg-line" />
          <span className="size-1.5 rounded-full bg-line" />
        </span>
      </div>
      {children}
    </div>
  );
}

const ITEMS = [
  { name: "Spinach", meta: "Fridge · 200 g", when: "today", bar: "bg-coral", width: "w-[12%]", chip: "missing" as const },
  { name: "Greek yoghurt", meta: "Fridge · 500 g", when: "2 days", bar: "bg-butter", width: "w-[38%]", chip: "soon" as const },
  { name: "Red peppers", meta: "Fridge · 2", when: "6 days", bar: "bg-sage", width: "w-[78%]", chip: "have" as const },
];

export function MiniKitchenPreview() {
  return (
    <Frame title="Your kitchen">
      <div className="flex items-center gap-2 rounded-pill border border-line bg-cream px-3 py-2 text-xs text-muted">
        <Plus className="size-3.5 text-sage-deep" strokeWidth={2.5} />
        Add “2 red peppers”…
      </div>
      <div className="mt-3 flex gap-1.5 text-[0.7rem] font-medium">
        <span className="rounded-pill bg-sage-deep px-2.5 py-1 text-cream">Fridge 8</span>
        <span className="rounded-pill bg-paper px-2.5 py-1 text-sage-deep">Pantry 14</span>
        <span className="rounded-pill bg-paper px-2.5 py-1 text-sage-deep">Freezer 5</span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {ITEMS.map((item) => (
          <li key={item.name} className="rounded-2xl border border-line bg-cream/60 px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex flex-col">
                <span className="text-sm font-medium text-ink">{item.name}</span>
                <span className="text-[0.7rem] text-muted">{item.meta}</span>
              </span>
              <Chip tone={item.chip}>{item.when}</Chip>
            </div>
            <div className="mt-2.5 h-1.5 rounded-pill bg-line/70">
              <div className={cn("h-full rounded-pill", item.bar, item.width)} />
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function MiniMealCardPreview() {
  return (
    <div className="relative px-4 pt-4 sm:px-8">
      {/* a second card peeking out behind, for depth */}
      <div className="absolute inset-x-10 bottom-6 top-0 rotate-[5deg] rounded-[28px] border border-line bg-paper shadow-soft sm:inset-x-14" />
      <article className="relative -rotate-[1.5deg] rounded-[28px] border border-line bg-card p-3 shadow-lift">
        <ArchImage
          src="https://img.spoonacular.com/recipes/716429-556x370.jpg"
          alt="Pasta with garlic, scallions and cauliflower"
          sizes="(min-width: 768px) 420px, 90vw"
          className="aspect-[4/3]"
        >
          <span className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-card/95 shadow-soft">
            <Heart className="size-4 fill-coral text-coral-deep" strokeWidth={2} />
          </span>
        </ArchImage>
        <div className="px-2 pb-2 pt-4">
          <p className="font-display text-[1.15rem] leading-snug text-sage-deep">Pasta with garlic, scallions and cauliflower</p>
          <p className="mt-1.5 line-clamp-2 text-[0.8rem] leading-relaxed text-muted">
            A bright, garlicky weeknight pasta that uses up the cauliflower before it turns.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip icon={<Clock />}>30 min</Chip>
            <Chip tone="have">uses 5</Chip>
            <Chip tone="missing">missing 2</Chip>
          </div>
        </div>
      </article>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["B", "L", "D"];
const MEALS: Record<string, { label: string; tone: string }> = {
  "0-0": { label: "Oats", tone: "bg-butter/60 text-butter-ink" },
  "1-2": { label: "Pasta", tone: "bg-sage-tint text-sage-deep" },
  "2-1": { label: "Soup", tone: "bg-blush/70 text-coral-tint-ink" },
  "3-2": { label: "Curry", tone: "bg-sage-tint text-sage-deep" },
  "4-0": { label: "Eggs", tone: "bg-butter/60 text-butter-ink" },
  "5-1": { label: "Salad", tone: "bg-sage-tint text-sage-deep" },
  "6-2": { label: "Tacos", tone: "bg-blush/70 text-coral-tint-ink" },
};

export function MiniPlannerPreview() {
  return (
    <Frame title="This week">
      <div className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1 sm:gap-1.5">
        <span />
        {DAYS.map((d, i) => (
          <span key={d} className={cn("pb-1 text-center text-[0.65rem] font-medium", i === 2 ? "text-coral-deep" : "text-muted")}>
            {d}
          </span>
        ))}
        {SLOTS.map((slot, s) => (
          <div key={slot} className="contents">
            <span className="grid place-items-center pr-1 text-[0.65rem] font-medium text-muted">{slot}</span>
            {DAYS.map((d, i) => {
              const meal = MEALS[`${i}-${s}`];
              const lifted = i === 3 && s === 2;
              return (
                <div
                  key={d}
                  className={cn(
                    "relative grid h-11 place-items-center rounded-lg sm:h-12",
                    meal ? meal.tone : "border border-dashed border-line",
                    lifted && "z-10 -rotate-6 shadow-lift ring-1 ring-sage-deep/15",
                  )}
                >
                  {meal && <span className="hidden truncate px-0.5 text-[0.62rem] font-medium sm:block">{meal.label}</span>}
                  {lifted && <Hand className="absolute -bottom-3 -right-2 size-5 fill-card text-sage-deep" strokeWidth={1.8} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-paper px-3.5 py-2.5 text-xs">
        <span className="text-ink">2 ingredients missing</span>
        <span className="font-medium text-coral-deep">Added to list</span>
      </div>
    </Frame>
  );
}

function Tick({ done }: { done?: boolean }) {
  return (
    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]", done ? "border-sage-deep bg-sage-tint" : "border-line bg-card")}>
      {done && (
        <svg viewBox="0 0 16 16" className="size-3.5 overflow-visible" fill="none">
          <path
            d="M3.2 8.6c1.2 1 2.2 2.1 3.1 3.4 1.6-3 3.6-5.6 6.4-8"
            className="stroke-sage-deep"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            style={{ animation: "mh-draw 0.8s 0.4s ease-out both" }}
          />
        </svg>
      )}
    </span>
  );
}

const AISLES = [
  { aisle: "Fruit & veg", items: [{ name: "Lemons × 2", done: true }, { name: "Spring onions" }] },
  { aisle: "Dairy", items: [{ name: "Parmesan" }] },
  { aisle: "Bakery", items: [{ name: "Sourdough loaf" }] },
];

export function MiniShoppingPreview() {
  return (
    <Frame title="Shopping list">
      <div className="flex flex-col gap-4">
        {AISLES.map((group) => (
          <div key={group.aisle}>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted">{group.aisle}</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {group.items.map((item) => (
                <li key={item.name} className="flex items-center gap-3 rounded-xl border border-line bg-cream/60 px-3 py-2.5 text-sm">
                  <Tick done={"done" in item && item.done} />
                  <span className={cn("done" in item && item.done ? "text-muted line-through decoration-sage-deep/50" : "text-ink")}>{item.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-pill bg-sage-deep px-4 py-2.5 text-xs font-medium text-cream">
        Lemons moved to your kitchen
      </div>
    </Frame>
  );
}

export function MiniAssistantPreview() {
  return (
    <Frame title="Kitchen assistant">
      <div className="flex flex-col gap-3">
        <p className="ml-auto max-w-[82%] rounded-[20px] rounded-br-md bg-sage-deep px-4 py-3 text-sm leading-snug text-cream">
          What can I do with half a lemon?
        </p>
        <div className="flex items-end gap-2">
          <LogoMark className="size-7" />
          <p className="max-w-[84%] rounded-[20px] rounded-bl-md border border-line bg-paper px-4 py-3 text-sm leading-relaxed text-ink">
            Squeeze it over the spinach before it turns, or zest it into tonight&apos;s pasta. Cut side down, it keeps 3 to 4 days in the fridge.
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2 rounded-pill border border-line bg-cream py-1.5 pl-4 pr-1.5 text-xs text-muted">
        Ask about your kitchen…
        <span className="grid size-8 place-items-center rounded-full bg-coral">
          <Send className="size-3.5 text-ink" strokeWidth={2.2} />
        </span>
      </div>
    </Frame>
  );
}
