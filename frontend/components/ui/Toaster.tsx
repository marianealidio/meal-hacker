"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ToastInput = {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: number; open: boolean };

type ToastContextValue = { toast: (t: ToastInput) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

const DURATION_MS = 5000;
/** Toasts with an action stay longer so there is time to reach the button. */
const DURATION_WITH_ACTION_MS = 8000;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <Toaster>");
  return ctx;
}

/** Wrap the app once. Provides `useToast()` and renders the viewport. */
export function Toaster({ children }: { children?: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      pending.clear();
    };
  }, []);

  const toast = useCallback((t: ToastInput) => {
    setItems((prev) => [...prev.slice(-2), { ...t, id: nextId++, open: true }]);
  }, []);

  const setOpen = useCallback((id: number, open: boolean) => {
    if (open) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, open: false } : i)));
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 300);
    timers.current.add(timer);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="down" duration={DURATION_MS}>
        {children}
        {items.map((t) => (
          <RadixToast.Root
            key={t.id}
            open={t.open}
            duration={t.action ? DURATION_WITH_ACTION_MS : DURATION_MS}
            onOpenChange={(open) => setOpen(t.id, open)}
            className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-sage-deep px-4 py-3.5 text-cream shadow-lift data-[state=open]:animate-[mh-slide-up_240ms_cubic-bezier(0.2,0.8,0.2,1)] data-[state=closed]:animate-[mh-fade-out_160ms_ease-in] data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)]"
          >
            <div className="min-w-0 flex-1">
              <RadixToast.Title className="text-sm font-medium">{t.title}</RadixToast.Title>
              {t.description && (
                <RadixToast.Description className="mt-0.5 text-sm text-cream/85">{t.description}</RadixToast.Description>
              )}
            </div>
            {t.action && (
              <RadixToast.Action
                altText={t.action.label}
                onClick={t.action.onClick}
                className="shrink-0 rounded-pill bg-cream/10 px-3 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-cream/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush"
              >
                {t.action.label}
              </RadixToast.Action>
            )}
            <RadixToast.Close
              aria-label="Dismiss"
              className="-my-1.5 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush"
            >
              <X className="size-4" aria-hidden="true" />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] mx-auto flex w-full max-w-sm flex-col gap-2 p-4 outline-none sm:inset-x-auto sm:right-0 sm:mx-0 sm:p-6" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
