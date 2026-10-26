"use client";

import { Send } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { ScriptNote } from "@/components/brand/ScriptNote";
import { Button } from "@/components/ui/Button";
import { Dialog, Sheet } from "@/components/ui/Dialog";
import { ApiError } from "@/lib/api";
import { useChat } from "@/lib/queries";
import type { ChatMessage } from "@/lib/types";
import { ChatThread } from "./ChatThread";

const STORAGE_KEY = "mh-assistant-thread";
const SEND_LIMIT = 20;
const SUGGESTIONS = ["What can I make with spinach?", "How long does cooked rice keep?", "Swap for buttermilk?"];
const THROTTLED = "You've asked a lot this hour — give me a little break and try again soon.";

function load(): ChatMessage[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((m): m is ChatMessage => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
      : [];
  } catch {
    return [];
  }
}

function save(messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    /* storage unavailable: the thread just won't survive navigation */
  }
}

function noticeFor(err: unknown): string {
  if (err instanceof ApiError && err.status === 429) return THROTTLED;
  return err instanceof Error ? err.message : "The assistant can't answer right now. Try again soon.";
}

const LG = "(min-width: 1024px)";
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia(LG);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => (typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(LG).matches),
    () => false,
  );
}

export function AssistantPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const desktop = useIsDesktop();
  const chat = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>(load);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);

  const commit = (next: ChatMessage[]) => {
    setMessages(next);
    save(next);
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || inFlight.current) return;
    inFlight.current = true;
    const gen = generation.current;
    const next = [...messages, { role: "user" as const, content: text }];
    commit(next);
    setDraft("");
    setNotice(null);
    // A window cut mid-exchange can start on a reply; the API expects a user turn first.
    const window = next.slice(-SEND_LIMIT);
    if (window[0]?.role === "assistant") window.shift();
    chat.mutate(window, {
      onSuccess: ({ reply }) => {
        if (gen === generation.current) commit([...next, { role: "assistant", content: reply }]);
      },
      onError: (err) => {
        if (gen !== generation.current) return;
        commit(messages);
        setDraft((d) => (d === "" ? text : d));
        setNotice(noticeFor(err));
      },
      onSettled: () => {
        inFlight.current = false;
      },
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(draft);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Sheet side={desktop ? "right" : "bottom"} title="Kitchen assistant" className="flex flex-col">
        <div className="flex flex-col gap-4">
          <ScriptNote>ask me anything about food</ScriptNote>
          {messages.length === 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Suggestions">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="min-h-11 rounded-pill border border-sage-deep/30 bg-sage-tint px-4 text-sm text-sage-deep transition-colors hover:bg-sage/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ChatThread messages={messages} pending={chat.isPending} notice={notice} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex items-end gap-2"
          >
            <div className="min-w-0 flex-1">
              <label htmlFor="assistant-message" className="mb-1 block text-sm font-medium text-sage-deep">
                Message
              </label>
              <textarea
                id="assistant-message"
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                className="w-full resize-none rounded-2xl border border-line bg-cream px-4 py-2.5 text-[0.95rem] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep"
              />
            </div>
            <Button type="submit" aria-label="Send" disabled={chat.isPending || !draft.trim()} className="size-11 shrink-0 !px-0">
              <Send className="size-5" aria-hidden="true" />
            </Button>
          </form>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              disabled={chat.isPending}
              onClick={() => {
                generation.current += 1;
                commit([]);
                setNotice(null);
              }}
            >
              Clear chat
            </Button>
          )}
        </div>
      </Sheet>
    </Dialog>
  );
}
