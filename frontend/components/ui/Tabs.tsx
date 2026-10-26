"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...rest }: ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn("flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:none]", className)}
      {...rest}
    />
  );
}

export function TabsTrigger({ className, ...rest }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "relative -mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-0.5 text-[0.95rem] text-muted",
        "transition-colors duration-150 hover:text-sage-deep",
        "data-[state=active]:border-coral data-[state=active]:font-medium data-[state=active]:text-sage-deep",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep",
        className,
      )}
      {...rest}
    />
  );
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn("pt-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep", className)} {...rest} />;
}
