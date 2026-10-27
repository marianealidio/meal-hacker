"use client";

import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const Menu = RadixMenu.Root;
export const MenuTrigger = RadixMenu.Trigger;

export function MenuContent({ className, sideOffset = 8, align = "end", ...rest }: ComponentProps<typeof RadixMenu.Content>) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-48 rounded-2xl border border-line bg-card p-1.5 shadow-lift",
          "origin-[var(--radix-dropdown-menu-content-transform-origin)] data-[state=open]:animate-[mh-pop-in_160ms_ease-out]",
          className,
        )}
        {...rest}
      />
    </RadixMenu.Portal>
  );
}

export type MenuItemProps = ComponentProps<typeof RadixMenu.Item> & { tone?: "danger" };

export function MenuItem({ tone, className, ...rest }: MenuItemProps) {
  return (
    <RadixMenu.Item
      className={cn(
        "flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 text-sm outline-none",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        tone === "danger"
          ? "text-coral-deep data-[highlighted]:bg-coral-tint data-[highlighted]:text-coral-tint-ink"
          : "text-ink data-[highlighted]:bg-sage-tint data-[highlighted]:text-sage-deep",
        "data-[highlighted]:outline-2 data-[highlighted]:-outline-offset-2 data-[highlighted]:outline-coral-deep",
        className,
      )}
      {...rest}
    />
  );
}

export function MenuSeparator({ className }: { className?: string }) {
  return <RadixMenu.Separator className={cn("mx-2 my-1 h-px bg-line", className)} />;
}
