"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";

type WakeLock = { release: () => Promise<void> };

/** Holds a screen wake lock while `active`; silently does nothing where unsupported. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator) || !navigator.wakeLock) return;
    let lock: WakeLock | null = null;
    let cancelled = false;
    Promise.resolve(navigator.wakeLock.request("screen"))
      .then((l) => {
        if (cancelled) void l.release().catch(() => {});
        else lock = l;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      void lock?.release().catch(() => {});
    };
  }, [active]);
}

export type CookModeProps = { title: string; steps: string[]; open: boolean; onOpenChange: (open: boolean) => void };

export function CookMode({ title, steps, open, onOpenChange }: CookModeProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description="Cook mode. Use the arrow keys to move between steps."
        className="inset-0 flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-0 bg-cream p-6 sm:p-10"
      >
        <CookSteps steps={steps} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CookSteps({ steps, onClose }: { steps: string[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  useWakeLock(true);
  const last = steps.length - 1;
  const go = (n: number) => setIndex(Math.min(last, Math.max(0, n)));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(last, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [last]);

  if (steps.length === 0) return <p className="text-muted">No method was provided for this one.</p>;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <p className="text-sm font-medium text-coral-deep">Step {index + 1} of {steps.length}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-line" aria-hidden="true">
        <div className="h-full rounded-pill bg-coral-deep" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>
      <div className="flex flex-1 items-center py-8">
        <p className="text-display-md text-ink">{steps[index]}</p>
      </div>
      {index === last && <p className="mb-4 font-display text-xl text-sage-deep">Done — enjoy!</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="lg" disabled={index === 0} onClick={() => go(index - 1)}>
          <ChevronLeft className="size-5" aria-hidden="true" /> Previous
        </Button>
        {index === last ? (
          <Button variant="primary" size="lg" onClick={onClose}>
            Close
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={() => go(index + 1)}>
            Next <ChevronRight className="size-5" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
