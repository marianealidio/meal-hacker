import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import KitchenPage from "@/app/(app)/kitchen/page";
import { Toaster } from "@/components/ui/Toaster";
import type { Category, InventoryItem } from "@/lib/types";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const item = (id: number, name: string, days: number | null, category: Category = "Fridge"): InventoryItem => ({
  id, name, quantity: "2", unit: "", category, expiry_date: null, days_left: days, expires_soon: false, date_added: "",
});

type Call = { url: string; method: string; body?: string };
function mockFetch(items: InventoryItem[], extra: Record<string, () => Response> = {}) {
  const calls: Call[] = [];
  let live = [...items];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    const key = Object.keys(extra).find((k) => `${method} ${url}`.startsWith(k));
    if (key) return extra[key]();
    if (method === "GET" && url.startsWith("/api/inventory/")) return json(live);
    if (method === "POST" && url === "/api/inventory/") return json(item(99, "Red peppers", 5), 201);
    if (method === "POST" && url.endsWith("/use/")) {
      live = live.filter((i) => `/api/inventory/${i.id}/use/` !== url);
      return json(items[0]);
    }
    if (method === "DELETE") {
      live = live.filter((i) => `/api/inventory/${i.id}/` !== url);
      return new Response(null, { status: 204 });
    }
    return json({ error: { code: "x", message: "no route", fields: {} } }, 404);
  });
  return calls;
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Toaster><KitchenPage /></Toaster></QueryClientProvider>);
}

const cards = () => screen.getAllByRole("article");
const cardNames = () => cards().map((c) => within(c).getByRole("heading").textContent);

beforeEach(() => {
  document.cookie = "csrftoken=t; path=/";
});
afterEach(() => vi.restoreAllMocks());

describe("Kitchen", () => {
  it("quick add sends text and category, then clears and refocuses the input", async () => {
    const calls = mockFetch([item(1, "Milk", 5)]);
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Milk");
    const input = screen.getByLabelText("Add an ingredient");
    await user.type(input, "2 red peppers{Enter}");
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url === "/api/inventory/")).toBe(true));
    const post = calls.find((c) => c.method === "POST")!;
    expect(JSON.parse(post.body!)).toEqual({ text: "2 red peppers", category: "Fridge" });
    await waitFor(() => expect(input).toHaveValue(""));
    expect(input).toHaveFocus();
    expect(await screen.findByText(/Added Red peppers/)).toBeInTheDocument();
  });

  it("shows counts on the tabs and filters when switching", async () => {
    mockFetch([item(1, "Milk", 5), item(2, "Eggs", 6), item(3, "Rice", 90, "Pantry")]);
    const user = userEvent.setup();
    wrap();
    expect(await screen.findByRole("tab", { name: "Fridge 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pantry 1" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Freezer 0" })).toBeInTheDocument();
    expect(cards()).toHaveLength(2);
    await user.click(screen.getByRole("tab", { name: "Pantry 1" }));
    expect(cardNames()).toEqual(["Rice"]);
    await user.click(screen.getByRole("tab", { name: "Freezer 0" }));
    expect(screen.getByText("Your Freezer is empty")).toBeInTheDocument();
  });

  it("shows the use-it-up banner linking to matching recipes", async () => {
    mockFetch([item(1, "Spinach", 0), item(2, "Milk", 9)]);
    wrap();
    const link = await screen.findByRole("link", { name: "See recipes" });
    expect(link).toHaveAttribute("href", "/recipes?matches_kitchen=1");
    expect(screen.getByText(/Use it up:/)).toBeInTheDocument();
    expect(screen.getByText(/Spinach expires soon/)).toBeInTheDocument();
  });

  it("ignores already-expired items when deciding to show the banner", async () => {
    mockFetch([item(1, "Old milk", -3), item(2, "Rice", 9)]);
    wrap();
    await screen.findByText("Old milk");
    expect(screen.queryByText(/Use it up:/)).not.toBeInTheDocument();
  });

  it("hides the banner when nothing is close to expiring", async () => {
    mockFetch([item(1, "Milk", 9)]);
    wrap();
    await screen.findByText("Milk");
    expect(screen.queryByText(/Use it up:/)).not.toBeInTheDocument();
  });

  it("marks an item as used and removes the card straight away", async () => {
    const calls = mockFetch([item(1, "Milk", 5), item(2, "Eggs", 6)]);
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Milk");
    await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
    await user.click(await screen.findByRole("menuitem", { name: "Mark as used" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Milk" })).not.toBeInTheDocument());
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url === "/api/inventory/1/use/")).toBe(true));
  });

  it("asks before deleting, then sends DELETE", async () => {
    const calls = mockFetch([item(1, "Milk", 5)]);
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Milk");
    await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete Milk?" });
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/inventory/1/")).toBe(true));
  });

  it("keeps the item when delete is cancelled", async () => {
    const calls = mockFetch([item(1, "Milk", 5)]);
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Milk");
    await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    expect(screen.getByRole("heading", { name: "Milk" })).toBeInTheDocument();
  });

  it("moves an item to another category", async () => {
    const calls = mockFetch([item(1, "Milk", 5)]);
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Milk");
    await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
    await user.click(await screen.findByRole("menuitem", { name: "Move to Freezer" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(patch.url).toBe("/api/inventory/1/");
    expect(JSON.parse(patch.body!)).toEqual({ category: "Freezer" });
  });

  it("sorts A-Z on request, expiring first by default", async () => {
    mockFetch([item(1, "Milk", 5), item(2, "Apples", 9), item(3, "Cheese", 1)]);
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Milk");
    expect(cardNames()).toEqual(["Cheese", "Milk", "Apples"]);
    await user.selectOptions(screen.getByLabelText("Sort"), "A–Z");
    expect(cardNames()).toEqual(["Apples", "Cheese", "Milk"]);
  });

  it("shows the server's field error under the input", async () => {
    mockFetch([], {
      "POST /api/inventory/": () =>
        json({ error: { code: "validation", message: "Check the form.", fields: { name: ["Give it a name."] } } }, 400),
    });
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Your Fridge is empty");
    const input = screen.getByLabelText("Add an ingredient");
    await user.type(input, "  {Enter}");
    expect(await screen.findByText("Give it a name.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("the dashed card sets the category and focuses the input", async () => {
    mockFetch([item(1, "Rice", 90, "Pantry")]);
    const user = userEvent.setup();
    wrap();
    await user.click(await screen.findByRole("tab", { name: /Pantry/ }));
    await user.click(screen.getByRole("button", { name: "Add to Pantry" }));
    expect(screen.getByLabelText("Add an ingredient")).toHaveFocus();
    expect(screen.getByLabelText("Category")).toHaveValue("Pantry");
  });

  it("edits an item", async () => {
    const calls = mockFetch([item(1, "Milk", 5)]);
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Milk");
    await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Milk" });
    const name = within(dialog).getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Oat milk");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    expect(JSON.parse(calls.find((c) => c.method === "PATCH")!.body!)).toMatchObject({ name: "Oat milk", category: "Fridge" });
  });

  it("shows a retry card when loading fails", async () => {
    mockFetch([], { "GET /api/inventory/": () => json({ error: { code: "network", message: "Down", fields: {} } }, 500) });
    wrap();
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
