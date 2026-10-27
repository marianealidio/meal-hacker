"use client";

import { BookOpen, CalendarDays, Heart, Home, Refrigerator, ShoppingBasket, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV, isActive } from "@/lib/nav";

const ICONS: Record<(typeof NAV)[number]["icon"], LucideIcon> = { Home, Refrigerator, BookOpen, Heart, CalendarDays, ShoppingBasket };

export function NavItems({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {NAV.map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[0.95rem] no-underline transition-colors focus-visible:outline-butter",
                active ? "bg-cream font-medium text-sage-deep" : "text-cream/85 hover:bg-white/10",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
