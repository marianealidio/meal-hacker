import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShoppingPage from "@/app/(app)/shopping/page";
import { Toaster } from "@/components/ui/Toaster";
import type { ShoppingItem } from "@/lib/types";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const item = (id: number, name: string, aisle: string, checked = false, over: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id, ingredient_name: name, quantity: "1", aisle, checked, source: "manual", meal_plan: null, date_added: "", ...over,
});

type Call = { url: string; method: string; body?: string };
function mockFetch(items: ShoppingItem[], extra: Record<string, () => Response> = {}) {
  const calls: Call[] = [];
  let live = [...items];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    const key = Object.keys(extra).find((k) => `${method} ${url}`.startsWith(k));
    if (key) return extra[key]();
    if (method === "GET" && url === "/api/shopping/") return json(live);
    if (method === "POST" && url === "/api/shopping/") {
      const body = JSON.parse(init!.body as string);
      const created = item(99, body.ingredient_name, "", false, { quantity: body.quantity ?? "" });
      live = [...live, created];
      return json(created, 201);
    }
    if (method === "PATCH") {
      const id = Number(url.split("/")[3]);
      const patch = JSON.parse(init!.body as string);
      live = live.map((i) => (i.id === id ? { ...i, ...patch } : i));
      return json(live.find((i) => i.id === id));
    }
    if (method === "POST" && url.endsWith("/clear-checked/")) {
      const n = live.filter((i) => i.checked).length;
      live = live.filter((i) => !i.checked);
      return json({ deleted: n });
    }
    if (method === "POST" && url.endsWith("/to-inventory/")) {
      const id = Number(url.split("/")[3]);
      live = live.filter((i) => i.id !== id);
      return json({ id: 1 }, 201);
    }
    if (method === "DELETE") {
      const id = Number(url.split("/")[3]);
      live = live.filter((i) => i.id !== id);
      return new Response(null, { status: 204 });
    }
    return json({ error: { code: "x", message: "no route", fields: {} } }, 404);
  });
  return calls;
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Toaster><ShoppingPage /></Toaster></QueryClientProvider>);
}

const LIST = [
  item(1, "Milk", "Dairy"),
  item(2, "Salt", ""),
  item(3, "Apples", "Produce"),
  item(4, "Bread", "Bakery", true),
  item(5, "Cheese", "Dairy", false, { source: "auto" }),
];

beforeEach(() => {
  document.cookie = "csrftoken=t; path=/";
});
afterEach(() => vi.restoreAllMocks());

describe("Shopping list", () => {
  it("groups by aisle with Other last and In the basket at the end", async () => {
    mockFetch(LIST);
    wrap();
    await screen.findByText("Milk");
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Dairy", "Produce", "Other", "In the basket"]);
    const dairy = screen.getByRole("heading", { name: "Dairy" }).closest("section")!;
    expect(within(dairy).getAllByRole("checkbox")).toHaveLength(2);
    expect(within(dairy).getByText("from your plan")).toBeInTheDocument();
    const basket = screen.getByRole("heading", { name: "In the basket" }).closest("section")!;
    expect(within(basket).getByRole("checkbox", { name: "Bread 1" })).toBeChecked();
  });

  it("a tick sends PATCH checked and offers Move to kitchen in the toast", async () => {
    const calls = mockFetch(LIST);
    const user = userEvent.setup();
    wrap();
    await user.click(await screen.findByRole("checkbox", { name: "Milk 1" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(patch.url).toBe("/api/shopping/1/");
    expect(JSON.parse(patch.body!)).toEqual({ checked: true });
    expect(await screen.findByText("Milk ticked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move to kitchen" })).toBeInTheDocument();
    expect(await screen.findByRole("checkbox", { name: "Milk 1" })).toBeChecked();
  });

  it("rolls back a failed tick and shows an error toast", async () => {
    mockFetch(LIST, {
      "PATCH /api/shopping/1/": () => json({ error: { code: "boom", message: "Couldn't tick that.", fields: {} } }, 500),
    });
    const user = userEvent.setup();
    wrap();
    await user.click(await screen.findByRole("checkbox", { name: "Milk 1" }));
    expect(await screen.findByText("Couldn't tick that.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Milk 1" })).not.toBeChecked());
    expect(screen.queryByText("Milk ticked")).not.toBeInTheDocument();
  });

  it("moves an item to the kitchen with category and expiry", async () => {
    const calls = mockFetch(LIST);
    const user = userEvent.setup();
    wrap();
    await user.click(await screen.findByRole("button", { name: "Move Milk to your kitchen" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText("Category"), "Fridge");
    await user.type(within(dialog).getByLabelText("Expiry"), "2026-11-02");
    await user.click(within(dialog).getByRole("button", { name: "Move" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/shopping/1/to-inventory/")).toBe(true));
    const post = calls.find((c) => c.url === "/api/shopping/1/to-inventory/")!;
    expect(post.method).toBe("POST");
    expect(JSON.parse(post.body!)).toEqual({ category: "Fridge", expiry_date: "2026-11-02" });
    expect(await screen.findByText("Moved to your kitchen")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Milk")).not.toBeInTheDocument());
    // Focus lands on a sensible neighbour rather than falling to the body.
    await waitFor(() => expect(document.body).not.toHaveFocus());
  });

  it("opens the move dialog from the toast action", async () => {
    mockFetch(LIST);
    const user = userEvent.setup();
    wrap();
    await user.click(await screen.findByRole("checkbox", { name: "Apples 1" }));
    await user.click(await screen.findByRole("button", { name: "Move to kitchen" }));
    expect(await screen.findByRole("dialog", { name: "Move Apples to your kitchen" })).toBeInTheDocument();
  });

  it("shows Clear ticked only when something is ticked, and posts clear-checked", async () => {
    const calls = mockFetch(LIST);
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Milk");
    await user.click(screen.getByRole("button", { name: "Clear ticked" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/shopping/clear-checked/")).toBe(true));
    expect(calls.find((c) => c.url === "/api/shopping/clear-checked/")!.method).toBe("POST");
    expect(await screen.findByText("Cleared 1 item")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Clear ticked" })).not.toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "In the basket" })).not.toBeInTheDocument();
  });

  it("hides Clear ticked when nothing is ticked", async () => {
    mockFetch([item(1, "Milk", "Dairy")]);
    wrap();
    await screen.findByText("Milk");
    expect(screen.queryByRole("button", { name: "Clear ticked" })).not.toBeInTheDocument();
  });

  it("adds an item and clears the input", async () => {
    const calls = mockFetch([item(1, "Milk", "Dairy")]);
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Milk");
    const input = screen.getByLabelText("Add an item");
    await user.type(input, "Lemons");
    await user.type(screen.getByLabelText("Quantity"), "3");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url === "/api/shopping/")).toBe(true));
    expect(JSON.parse(calls.find((c) => c.method === "POST")!.body!)).toEqual({ ingredient_name: "Lemons", quantity: "3" });
    await waitFor(() => expect(input).toHaveValue(""));
    expect(screen.getByLabelText("Quantity")).toHaveValue("");
    expect(input).toHaveFocus();
    expect(await screen.findByRole("checkbox", { name: "Lemons 3" })).toBeInTheDocument();
  });

  it("deletes an item and moves focus to the next row", async () => {
    const calls = mockFetch([item(1, "Milk", "Dairy"), item(2, "Cheese", "Dairy")]);
    const user = userEvent.setup();
    wrap();
    await user.click(await screen.findByRole("button", { name: "Delete Milk" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE")).toBe(true));
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Cheese 1" })).toHaveFocus());
  });

  it("shows the empty state with a Browse recipes link", async () => {
    mockFetch([]);
    wrap();
    expect(await screen.findByText("Your list is empty")).toBeInTheDocument();
    expect(screen.getByText("Add items here, or add a recipe to your plan and we'll list what's missing.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse recipes" })).toHaveAttribute("href", "/recipes");
  });

  it("shows an error card that retries", async () => {
    let fail = true;
    mockFetch([item(1, "Milk", "Dairy")], {
      "GET /api/shopping/": () =>
        fail ? json({ error: { code: "x", message: "Shopping is down.", fields: {} } }, 500) : json([item(1, "Milk", "Dairy")]),
    });
    const user = userEvent.setup();
    wrap();
    expect(await screen.findByText("Shopping is down.")).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Milk")).toBeInTheDocument();
  });

  it("prints from the Print button", async () => {
    mockFetch(LIST);
    const print = vi.fn();
    vi.stubGlobal("print", print);
    const user = userEvent.setup();
    wrap();
    await screen.findByText("Milk");
    await user.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
