"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button, type ButtonSize } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useDemoLogin } from "@/lib/queries";

export type OpenKitchenButtonProps = {
  variant?: "primary" | "dark";
  size?: ButtonSize;
  /** Adds the hand-off arrow used by the hero and the closing call to action. */
  arrow?: boolean;
  /** Which edge the error note hangs from; "end" suits a button at the right of a bar. */
  messageAlign?: "start" | "end";
  /** Applied to the wrapper; pass "w-full" for a full-width button. */
  className?: string;
};

/** Signs into the shared demo kitchen and sends the visitor to the dashboard. */
export function OpenKitchenButton({
  variant = "primary",
  size = "md",
  arrow = false,
  messageAlign = "start",
  className,
}: OpenKitchenButtonProps) {
  const router = useRouter();
  // Navigation lives on the mutation, not on mutate(), so it survives an unmount mid-request.
  const demo = useDemoLogin({ onSuccess: () => router.push("/dashboard") });
  // Guards the gap between a click and the pending re-render, and the navigation after success.
  const inFlight = useRef(false);
  const busy = demo.isPending || demo.isSuccess;

  function open() {
    if (inFlight.current) return;
    inFlight.current = true;
    demo.mutate(undefined, {
      onError: () => {
        inFlight.current = false;
      },
    });
  }

  return (
    <span className={cn("relative inline-flex flex-col", className)}>
      <Button variant={variant} size={size} pending={busy} onClick={open} className="group">
        {arrow ? "Open the kitchen " : "Open the kitchen"}
        {arrow && (
          <span className="-ml-1 inline-block transition-transform duration-200 ease-out group-hover:translate-x-1">→</span>
        )}
      </Button>
      {demo.isError && (
        <span
          role="status"
          className={cn(
            "absolute top-full z-10 mt-2 w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-coral-tint-ink/15",
            "bg-coral-tint px-3.5 py-2 text-left text-sm leading-snug text-coral-tint-ink shadow-soft",
            "animate-[mh-slide-up_200ms_ease-out]",
            messageAlign === "end" ? "right-0" : "left-0",
          )}
        >
          {demo.error.message}
        </span>
      )}
    </span>
  );
}
