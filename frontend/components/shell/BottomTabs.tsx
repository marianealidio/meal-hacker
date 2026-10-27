"use client";

import { BookOpen, CalendarDays, Home, Refrigerator, ShoppingBasket, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV, isActive } from "@/lib/nav";

const ICONS: Record<string, LucideIcon> = { Home, Refrigerator, BookOpen, CalendarDays, ShoppingBasket };

/** Favourites is reachable from Recipes and the desktop sidebar, so it is not a tab. */
const TABS = NAV.filter((n) => n.href !== "/favourites");

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      data-print="hide"
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ href, label, icon }) => {
          const Icon = ICONS[icon];
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] no-underline",
                  active ? "font-bold text-sage-deep" : "text-muted",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-pill transition-colors", active && "bg-sage-tint")}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
