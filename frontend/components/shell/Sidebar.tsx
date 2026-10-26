"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { initials } from "@/lib/nav";
import { useLogout } from "@/lib/queries";
import type { Me } from "@/lib/types";
import { NavItems } from "./NavItems";

export type SidebarProps = {
  me: Me;
  /** Items used before expiry this month; wired to real data in Plan C. */
  stat?: number | null;
};

export function Sidebar({ me, stat = null }: SidebarProps) {
  const router = useRouter();
  const logout = useLogout();
  const name = me.display_name || me.username;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col gap-6 overflow-y-auto bg-sage-deep p-5 text-cream lg:flex">
      <Link href="/dashboard" className="w-fit rounded-pill px-1 py-1 no-underline focus-visible:outline-butter">
        <Logo tone="light" />
      </Link>

      <nav aria-label="Primary" className="flex-1">
        <NavItems />
      </nav>

      <div className="rounded-card bg-sage p-4 text-sage-ink">
        <p className="text-xs font-bold uppercase tracking-[0.14em]">This month</p>
        <p className="mt-1 font-display text-3xl font-medium">{stat === null ? "—" : stat} items</p>
        <p className="text-sm">used before expiry</p>
      </div>

      <div className="flex items-center gap-3 border-t border-cream/15 pt-4">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-blush font-display text-sage-ink">
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <Link href="/profile" className="text-xs text-cream/85 underline decoration-cream/40 focus-visible:outline-butter">
            Profile
          </Link>
        </div>
        <Button
          variant="ghost"
          size="sm"
          pending={logout.isPending}
          onClick={() => logout.mutate(undefined, { onSuccess: () => { router.replace("/"); router.refresh(); } })}
          className="px-3 text-cream hover:bg-white/10 focus-visible:outline-butter"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
