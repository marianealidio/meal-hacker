"use client";

import { LogOut, MessageCircle, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { greeting } from "@/lib/greeting";
import { initials } from "@/lib/nav";
import { useLogout } from "@/lib/queries";
import type { Me } from "@/lib/types";

export function AppHeader({ me, onAssistant = () => {} }: { me: Me; onAssistant?: () => void }) {
  const name = me.display_name || me.username;
  const router = useRouter();
  const logout = useLogout();
  // Server and client clocks differ; render the greeting after mount to avoid a hydration mismatch.
  const [text, setText] = useState(() => greeting(new Date(), name));
  useEffect(() => setText(greeting(new Date(), name)), [name]);

  return (
    <header data-print="hide" className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10 lg:py-6">
      <div className="min-w-0">
        <Link href="/dashboard" className="mb-2 inline-flex rounded-pill no-underline lg:hidden">
          <Logo />
        </Link>
        <p className="break-words font-display text-display-md leading-tight text-sage-deep" suppressHydrationWarning>
          {text}
        </p>
        {me.is_demo && (
          <span className="mt-1 inline-block rounded-pill bg-butter/40 px-3 py-0.5 text-xs font-medium text-butter-ink">
            Demo kitchen · resets daily
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open kitchen assistant"
          onClick={onAssistant}
          className="grid size-11 place-items-center rounded-full border border-line bg-card text-sage-deep shadow-soft transition-colors hover:bg-sage-tint"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
        </button>
        <Link
          href="/profile"
          aria-label="Profile"
          className="hidden size-11 place-items-center rounded-full bg-blush font-display text-base font-medium text-sage-ink no-underline lg:grid"
        >
          {initials(name)}
        </Link>
        <Menu>
          <MenuTrigger
            aria-label="Account menu"
            className="grid size-11 place-items-center rounded-full bg-blush font-display text-base font-medium text-sage-ink lg:hidden"
          >
            {initials(name)}
          </MenuTrigger>
          <MenuContent>
            <MenuItem asChild>
              <Link href="/profile" className="no-underline">
                <User aria-hidden="true" />
                Profile
              </Link>
            </MenuItem>
            <MenuItem
              disabled={logout.isPending}
              onSelect={() =>
                logout.mutate(undefined, {
                  onSuccess: () => {
                    router.replace("/");
                    router.refresh();
                  },
                })
              }
            >
              <LogOut aria-hidden="true" />
              Log out
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </header>
  );
}
