import { Heart, Leaf, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Doodle } from "@/components/brand/Doodle";
import { Reveal } from "@/components/brand/Reveal";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";

function Tile({
  icon: Icon,
  title,
  body,
  className,
  iconClass = "bg-card text-sage-deep",
  children,
  delay = 0,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
  iconClass?: string;
  children?: ReactNode;
  delay?: number;
}) {
  return (
    <Reveal
      delay={delay}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[28px] border border-line p-5 transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-lift sm:p-7",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("grid size-11 place-items-center rounded-full shadow-soft", iconClass)}>
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <h3 className="mt-5 text-title">{title}</h3>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{body}</p>
      {children}
    </Reveal>
  );
}

const WEEKS = [38, 55, 46, 72, 64, 88];

export function Bento() {
  return (
    <section aria-labelledby="bento-title" className="bg-cream">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-32">
        <Reveal>
          <h2 id="bento-title" className="text-display-lg">
            And a few small luxuries
          </h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-14 lg:grid-cols-4 lg:grid-rows-[auto_auto_auto]">
          {/* waste stats: the headline tile */}
          <Reveal className="relative col-span-2 flex flex-col justify-between overflow-hidden rounded-[28px] border border-line bg-sage-tint p-6 sm:p-8 lg:row-span-2">
            <Doodle name="sprig" className="pointer-events-none absolute -right-4 -top-3 size-36 rotate-[24deg] text-sage-deep opacity-15" />
            <h3 className="text-title">Waste stats</h3>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <p className="flex items-end gap-3 text-sage-deep">
                <span className="font-display text-[clamp(4.5rem,3rem+6vw,7.5rem)] font-medium leading-[0.85] tracking-[-0.04em]">12</span>
                <span className="mb-1 max-w-[9ch] text-[1.05rem] leading-snug">items saved this month</span>
              </p>
              <div aria-hidden="true" className="flex h-24 items-end gap-2">
                {WEEKS.map((h, i) => (
                  <span
                    key={i}
                    className={cn("w-4 rounded-t-pill sm:w-5", i === WEEKS.length - 1 ? "bg-sage-deep" : "bg-sage/70")}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </Reveal>

          <Tile icon={Heart} title="Favourites" body="Heart a recipe and it stays one tap away." className="bg-card" iconClass="bg-blush text-coral-deep" delay={0.05} />

          <Tile
            icon={Smartphone}
            title="Works on your phone"
            body="Add it to your home screen and check the fridge from the shop."
            className="order-last col-span-2 bg-paper lg:order-none lg:col-span-1 lg:col-start-4 lg:row-span-3 lg:row-start-1"
            delay={0.1}
          >
            {/* a little phone sketch, cropped by the tile edge */}
            <div aria-hidden="true" className="relative mt-8 hidden flex-1 justify-center lg:flex">
              <div className="absolute -bottom-10 w-[78%] rounded-t-[30px] border-[1.5px] border-b-0 border-sage-deep/40 bg-card p-3 pb-10 shadow-lift">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-pill bg-line" />
                <div className="flex flex-col gap-2">
                  <div className="rounded-xl bg-cream p-2.5">
                    <div className="h-1.5 w-2/3 rounded-pill bg-line" />
                    <div className="mt-2 h-1 w-full rounded-pill bg-line/70"><div className="h-full w-1/5 rounded-pill bg-coral" /></div>
                  </div>
                  <div className="rounded-xl bg-cream p-2.5">
                    <div className="h-1.5 w-1/2 rounded-pill bg-line" />
                    <div className="mt-2 h-1 w-full rounded-pill bg-line/70"><div className="h-full w-1/2 rounded-pill bg-butter" /></div>
                  </div>
                  <div className="rounded-xl bg-cream p-2.5">
                    <div className="h-1.5 w-3/4 rounded-pill bg-line" />
                    <div className="mt-2 h-1 w-full rounded-pill bg-line/70"><div className="h-full w-4/5 rounded-pill bg-sage" /></div>
                  </div>
                </div>
              </div>
            </div>
          </Tile>

          <Tile icon={Leaf} title="Diet and allergies" body="Set it once and every suggestion respects it." className="bg-paper" iconClass="bg-sage-tint text-sage-deep" delay={0.1} />

          <Tile
            icon={Sparkles}
            title="Use it up"
            body="One tap shows recipes for whatever goes off first."
            className="col-span-2 bg-blush/60 lg:col-span-3"
            iconClass="bg-card text-coral-deep"
            delay={0.15}
          >
            <div aria-hidden="true" className="mt-5 flex flex-wrap gap-2">
              <Chip tone="missing">spinach · today</Chip>
              <Chip tone="soon">yoghurt · 2 days</Chip>
              <Chip tone="soon">half a lemon · 3 days</Chip>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}
