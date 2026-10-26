"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/lib/types";

function Bubble({ role, children, tone = "paper" }: { role: ChatMessage["role"]; children: React.ReactNode; tone?: "paper" | "notice" }) {
  if (role === "user") {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-sage-deep px-4 py-2.5 text-[0.95rem] text-cream">
          {children}
        </p>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2">
      <LogoMark className="mt-1 size-7" />
      <p
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md px-4 py-2.5 text-[0.95rem] text-ink",
          tone === "notice" ? "bg-coral-tint text-[#8A3B29]" : "bg-paper",
        )}
      >
        {children}
      </p>
    </li>
  );
}

function Typing() {
  const reduced = useReducedMotion();
  return (
    <li className="flex items-start gap-2">
      <LogoMark className="mt-1 size-7" />
      <p className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-paper px-4 py-4">
        <span className="sr-only">Thinking</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            style={reduced ? undefined : { animationDelay: `${i * 160}ms` }}
            className={cn("size-2 rounded-full bg-muted", !reduced && "animate-[mh-float_900ms_ease-in-out_infinite]")}
          />
        ))}
      </p>
    </li>
  );
}

export function ChatThread({ messages, pending, notice }: { messages: ChatMessage[]; pending: boolean; notice: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, notice]);

  return (
    <div ref={ref} className="min-h-0 flex-1 overflow-y-auto pr-1">
      <ul aria-live="polite" aria-label="Conversation" className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.content}
          </Bubble>
        ))}
        {pending && <Typing />}
        {notice && (
          <Bubble role="assistant" tone="notice">
            {notice}
          </Bubble>
        )}
      </ul>
    </div>
  );
}
