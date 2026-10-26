import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), usePathname: () => "/dashboard" }));

import { AppShell } from "@/components/shell/AppShell";
import { AssistantPanel } from "@/components/features/assistant/AssistantPanel";
import { Toaster } from "@/components/ui/Toaster";
import type { Me } from "@/lib/types";

const me: Me = { id: 1, username: "demo", display_name: "Guest chef", diet: "", intolerances: [], onboarded: true, is_demo: true };
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function mockFetch(chat: (body: { messages: { role: string; content: string }[] }) => Response) {
  const bodies: { messages: { role: string; content: string }[] }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url === "/api/stats/") return json({ used_this_month: 7, expired_this_month: 1, meals_planned_this_week: 3, items_in_kitchen: 9, expiring_soon: 2 });
    if (url === "/api/csrf/") return json({});
    if (url === "/api/assistant/chat/") {
      const body = JSON.parse(init!.body as string);
      bodies.push(body);
      return chat(body);
    }
    return json({ error: { code: "x", message: "no route", fields: {} } }, 404);
  });
  return bodies;
}

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (ui: React.ReactNode) => (
  <QueryClientProvider client={client()}>
    <Toaster>{ui}</Toaster>
  </QueryClientProvider>
);

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("kitchen assistant", () => {
  it("pins the composer below a scrolling thread", async () => {
    mockFetch(() => json({ reply: "hi" }));
    render(wrap(<AppShell me={me}><p>content</p></AppShell>));
    await userEvent.click(screen.getByRole("button", { name: "Open kitchen assistant" }));
    const dialog = await screen.findByRole("dialog", { name: "Kitchen assistant" });
    expect(dialog).toHaveClass("flex-col");
    expect(within(dialog).getByRole("list", { name: "Conversation" }).parentElement).toHaveClass("flex-1", "overflow-y-auto");
    expect(within(dialog).getByLabelText("Message").closest("form")).toHaveClass("shrink-0");
  });

  it("opens from the header button as a dialog", async () => {
    mockFetch(() => json({ reply: "hi" }));
    render(wrap(<AppShell me={me}><p>content</p></AppShell>));
    await userEvent.click(screen.getByRole("button", { name: "Open kitchen assistant" }));
    expect(await screen.findByRole("dialog", { name: "Kitchen assistant" })).toBeInTheDocument();
  });

  it("sends a suggestion chip and renders the reply", async () => {
    const bodies = mockFetch(() => json({ reply: "Try a spinach omelette." }));
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    await userEvent.click(await screen.findByRole("button", { name: "What can I make with spinach?" }));
    expect(await screen.findByText("Try a spinach omelette.")).toBeInTheDocument();
    expect(bodies[0].messages).toEqual([{ role: "user", content: "What can I make with spinach?" }]);
    expect(screen.queryByRole("button", { name: "How long does cooked rice keep?" })).not.toBeInTheDocument();
  });

  it("shows the throttle message and restores the typed text on 429", async () => {
    mockFetch(() => json({ error: { code: "throttled", message: "Request was throttled. Expected available in 30 seconds.", fields: {} } }, 429));
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    const box = await screen.findByLabelText("Message");
    await userEvent.type(box, "Is this safe?{Enter}");
    expect(await screen.findByText("You've asked a lot this hour — give me a little break and try again soon.")).toBeInTheDocument();
    await waitFor(() => expect(box).toHaveValue("Is this safe?"));
  });

  it("shows the server message on 503", async () => {
    mockFetch(() => json({ error: { code: "assistant_unavailable", message: "The assistant can't answer right now. Try again soon.", fields: {} } }, 503));
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    const box = await screen.findByLabelText("Message");
    await userEvent.type(box, "Hello{Enter}");
    expect(await screen.findByText("The assistant can't answer right now. Try again soon.")).toBeInTheDocument();
    expect(box).toHaveValue("Hello");
  });

  it("keeps the thread across unmount and remount, and clears it on request", async () => {
    mockFetch(() => json({ reply: "Three to five days." }));
    const first = render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    await userEvent.click(await screen.findByRole("button", { name: "How long does cooked rice keep?" }));
    expect(await screen.findByText("Three to five days.")).toBeInTheDocument();
    first.unmount();

    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    const dialog = await screen.findByRole("dialog", { name: "Kitchen assistant" });
    expect(within(dialog).getByText("Three to five days.")).toBeInTheDocument();
    expect(within(dialog).getByText("How long does cooked rice keep?")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Clear chat" }));
    expect(within(dialog).queryByText("Three to five days.")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("mh-assistant-thread")).toBe("[]");
  });

  it("sends only the last 20 messages", async () => {
    const old = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `m${i}` }));
    sessionStorage.setItem("mh-assistant-thread", JSON.stringify(old));
    const bodies = mockFetch(() => json({ reply: "ok" }));
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    await userEvent.type(await screen.findByLabelText("Message"), "latest{Enter}");
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].messages).toHaveLength(19);
    expect(bodies[0].messages[0].role).toBe("user");
    expect(bodies[0].messages.at(-1)).toEqual({ role: "user", content: "latest" });
  });

  it("Shift+Enter adds a newline instead of sending", async () => {
    const bodies = mockFetch(() => json({ reply: "ok" }));
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    const box = await screen.findByLabelText("Message");
    await userEvent.type(box, "a{Shift>}{Enter}{/Shift}b");
    expect(box).toHaveValue("a\nb");
    expect(bodies).toHaveLength(0);
  });
});

describe("assistant concurrency and storage", () => {
  const unavailable = () => json({ error: { code: "assistant_unavailable", message: "The assistant can't answer right now. Try again soon.", fields: {} } }, 503);

  it("sends once when Enter fires twice before the first request settles", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const bodies: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input) === "/api/assistant/chat/") {
        bodies.push(init!.body);
        await gate;
        return json({ reply: "ok" });
      }
      return json({});
    });
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    const box = await screen.findByLabelText("Message");
    fireEvent.change(box, { target: { value: "hi" } });
    act(() => {
      fireEvent.keyDown(box, { key: "Enter" });
      fireEvent.keyDown(box, { key: "Enter" });
    });
    release();
    expect(await screen.findByText("ok")).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
  });

  it("does not overwrite text typed while waiting when the request fails", async () => {
    let fail!: () => void;
    const gate = new Promise<void>((r) => (fail = r));
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input) === "/api/assistant/chat/") {
        await gate;
        return unavailable();
      }
      return json({});
    });
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    const box = await screen.findByLabelText("Message");
    await userEvent.type(box, "first{Enter}");
    await userEvent.type(box, "second");
    fail();
    expect(await screen.findByText("The assistant can't answer right now. Try again soon.")).toBeInTheDocument();
    expect(box).toHaveValue("second");
  });

  it("disables Clear chat while a request is pending", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input) === "/api/assistant/chat/") {
        await gate;
        return json({ reply: "done" });
      }
      return json({});
    });
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    await userEvent.type(await screen.findByLabelText("Message"), "hi{Enter}");
    expect(screen.getByRole("button", { name: "Clear chat" })).toBeDisabled();
    release();
    expect(await screen.findByText("done")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear chat" })).toBeEnabled();
  });

  it("falls back to an empty thread when stored data is corrupt", async () => {
    sessionStorage.setItem("mh-assistant-thread", "{not json");
    mockFetch(() => json({ reply: "ok" }));
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    expect(await screen.findByRole("button", { name: "What can I make with spinach?" })).toBeInTheDocument();
  });

  it("falls back to an empty thread when sessionStorage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mockFetch(() => json({ reply: "Works anyway." }));
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    await userEvent.click(await screen.findByRole("button", { name: "Swap for buttermilk?" }));
    expect(await screen.findByText("Works anyway.")).toBeInTheDocument();
  });

  it("keeps the live conversation list mounted when empty, without a nested status role", async () => {
    mockFetch(() => json({ reply: "ok" }));
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    const list = await screen.findByRole("list", { name: "Conversation" });
    expect(list).toHaveAttribute("aria-live", "polite");
    expect(list).toBeEmptyDOMElement();
  });

  it("typing indicator has no nested status role", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    render(wrap(<AssistantPanel open onOpenChange={() => {}} />));
    await userEvent.type(await screen.findByLabelText("Message"), "hi{Enter}");
    expect(await screen.findByText("Thinking")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("sidebar stat", () => {
  it("shows used_this_month from the stats endpoint", async () => {
    mockFetch(() => json({ reply: "" }));
    render(wrap(<AppShell me={me}><p>content</p></AppShell>));
    expect(await screen.findByText("7 items")).toBeInTheDocument();
  });

  it("shows the full display name", () => {
    mockFetch(() => json({ reply: "" }));
    render(wrap(<AppShell me={me}><p>content</p></AppShell>));
    expect(screen.getByText("Guest chef", { selector: "aside p" })).not.toHaveClass("truncate");
  });
});
