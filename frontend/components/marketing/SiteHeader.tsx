"use client";

import { Menu as MenuIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ScriptNote } from "@/components/brand/ScriptNote";
import { ButtonLink } from "@/components/ui/Button";
import { Dialog, DialogTrigger, Sheet } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { OpenKitchenButton } from "./OpenKitchenButton";

export const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#about", label: "About" },
] as const;

const FROST_AT = 12;

function useScrolledPast(threshold: number) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const update = () => setPast(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);
  return past;
}

export function SiteHeader() {
  const scrolled = useScrolledPast(FROST_AT);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ease-out",
        scrolled ? "border-line bg-cream/80 backdrop-blur" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 md:h-[4.5rem] lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link href="/" className="-m-1.5 inline-flex rounded-pill p-1.5 no-underline">
          <Logo withWordmark />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={cn(
                    "relative inline-flex min-h-11 items-center rounded-pill px-3 text-sm font-medium text-sage-deep no-underline",
                    "transition-colors hover:text-sage-ink",
                    // a short coral pen stroke that draws in under the label
                    "after:pointer-events-none after:absolute after:inset-x-3 after:bottom-2 after:h-[2px] after:origin-left after:scale-x-0",
                    "after:rounded-pill after:bg-coral after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100",
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center justify-end gap-2 md:flex">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <OpenKitchenButton size="sm" messageAlign="end" />
        </div>

        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogTrigger
            aria-label="Open menu"
            className="-mr-1.5 grid size-11 place-items-center rounded-full text-sage-deep transition-colors hover:bg-paper md:hidden"
          >
            <MenuIcon className="size-6" strokeWidth={1.8} aria-hidden="true" />
          </DialogTrigger>
          <Sheet side="right" title="Menu">
            <nav aria-label="Mobile">
              <ol className="-mx-2 border-t border-line">
                {NAV_LINKS.map((link, i) => (
                  <li key={link.href} className="border-b border-line">
                    <a
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="group flex min-h-14 items-baseline gap-4 rounded-lg px-2 py-3 no-underline transition-colors hover:bg-paper"
                    >
                      <span aria-hidden="true" className="w-6 text-xs font-medium tabular-nums tracking-wider text-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display text-display-md text-sage-deep transition-transform duration-200 ease-out group-hover:translate-x-1">
                        {link.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-8 flex flex-col gap-3">
              <ButtonLink href="/login" variant="secondary" size="lg" className="w-full">
                Log in
              </ButtonLink>
              <ScriptNote arrow="down-right" className="mr-6 self-end text-[1.4rem]">
                no sign-up needed
              </ScriptNote>
              <OpenKitchenButton size="lg" className="-mt-2 w-full" />
            </div>
          </Sheet>
        </Dialog>
      </div>
    </header>
  );
}
