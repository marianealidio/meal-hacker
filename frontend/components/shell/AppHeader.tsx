"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { greeting } from "@/lib/greeting";
import { initials } from "@/lib/nav";
import type { Me } from "@/lib/types";

export function AppHeader({ me, onAssistant = () => {} }: { me: Me; onAssistant?: () => void }) {
  const name = me.display_name || me.username;
  // Server and client clocks differ; render the greeting after mount to avoid a hydration mismatch.
  const [text, setText] = useState(() => greeting(new Date(), name));
  useEffect(() => setText(greeting(new Date(), name)), [name]);

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10 lg:py-6">
      <div className="min-w-0">
        <Link href="/dashboard" className="mb-2 inline-flex rounded-pill no-underline lg:hidden">
          <Logo />
        </Link>
        <p className="truncate font-display text-display-md text-sage-deep" suppressHydrationWarning>
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
          className="grid size-11 place-items-center rounded-full bg-blush font-display text-base font-medium text-sage-ink no-underline"
        >
          {initials(name)}
        </Link>
      </div>
    </header>
  );
}
