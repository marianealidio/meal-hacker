"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ErrorCard } from "@/components/features/ErrorCard";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNote, useSaveNote } from "@/lib/queries";

const DELAY_MS = 800;

export function NotesCard({ className }: { className?: string }) {
  const { data, isPending, isError, error, refetch } = useNote();
  const { mutate, isPending: saving } = useSaveNote();
  const [text, setText] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<string | null>(null);
  const save = useRef(mutate);
  save.current = mutate;

  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current === null) return;
    const note = pending.current;
    pending.current = null;
    save.current(note, { onSuccess: () => setSaved(pending.current === null) });
  };

  // Don't lose a note typed in the last moments before navigating away.
  useEffect(() => () => {
    clearTimeout(timer.current);
    if (pending.current !== null) save.current(pending.current);
  }, []);

  if (isError && !data) return <div className={className}><ErrorCard error={error} onRetry={() => refetch()} /></div>;

  return (
    <Card as="section" aria-labelledby="notes-heading" className={cn("p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="notes-heading" className="text-title">Notes</h2>
        <p aria-live="polite" className="inline-flex items-center gap-1 text-xs font-medium text-sage-deep">
          {saving ? "Saving…" : saved && <><Check className="size-3.5" aria-hidden="true" />Saved</>}
        </p>
      </div>
      {isPending || !data ? (
        <Skeleton className="h-28" />
      ) : (
        <>
          <label htmlFor="dashboard-notes" className="sr-only">Your notes</label>
          <textarea
            id="dashboard-notes"
            rows={4}
            value={text ?? data.note}
            placeholder="Jot down anything — a recipe to try, what to buy…"
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
              pending.current = e.target.value;
              clearTimeout(timer.current);
              timer.current = setTimeout(flush, DELAY_MS);
            }}
            className="min-h-28 w-full resize-y rounded-xl border border-line bg-cream px-4 py-3 text-[0.95rem] leading-relaxed text-ink placeholder:text-muted focus-visible:border-coral-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep"
          />
        </>
      )}
    </Card>
  );
}
