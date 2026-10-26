"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

const overlay =
  "fixed inset-0 z-50 bg-sage-ink/40 backdrop-blur-[2px] data-[state=open]:animate-[mh-fade-in_200ms_ease-out]";

type PanelProps = Omit<ComponentProps<typeof RadixDialog.Content>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
};

function PanelHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="pr-10">
      <RadixDialog.Title className="font-display text-display-md text-sage-deep">{title}</RadixDialog.Title>
      {description && (
        <RadixDialog.Description className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">
          {description}
        </RadixDialog.Description>
      )}
    </div>
  );
}

function CloseButton() {
  return (
    <RadixDialog.Close
      aria-label="Close"
      className="absolute right-3 top-3 grid size-11 place-items-center rounded-full text-sage-deep transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep"
    >
      <X className="size-5" aria-hidden="true" />
    </RadixDialog.Close>
  );
}

export function DialogContent({ title, description, children, className, ...rest }: PanelProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={overlay} />
      <RadixDialog.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
          "rounded-card border border-line bg-card p-6 shadow-lift sm:p-8",
          "data-[state=open]:animate-[mh-pop-in_220ms_cubic-bezier(0.2,0.8,0.2,1)]",
          className,
        )}
        {...rest}
      >
        <PanelHeader title={title} description={description} />
        <div className="mt-5">{children}</div>
        <CloseButton />
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export type SheetProps = PanelProps & { side?: "right" | "bottom" };

export function Sheet({ side = "right", title, description, children, className, ...rest }: SheetProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={overlay} />
      <RadixDialog.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed z-50 overflow-y-auto border-line bg-card p-6 shadow-lift sm:p-8",
          side === "right"
            ? "inset-y-0 right-0 h-dvh w-[min(26rem,100vw-2rem)] rounded-l-card border-l data-[state=open]:animate-[mh-slide-left_260ms_cubic-bezier(0.2,0.8,0.2,1)]"
            : "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-card border-t data-[state=open]:animate-[mh-slide-up_260ms_cubic-bezier(0.2,0.8,0.2,1)]",
          className,
        )}
        {...rest}
      >
        {side === "bottom" && <div aria-hidden="true" className="mx-auto -mt-2 mb-4 h-1.5 w-10 rounded-pill bg-line" />}
        <PanelHeader title={title} description={description} />
        <div className="mt-5">{children}</div>
        <CloseButton />
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
