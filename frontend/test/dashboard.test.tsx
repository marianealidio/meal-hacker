import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddToPlanDialog } from "@/components/features/AddToPlanDialog";
import { Toaster } from "@/components/ui/Toaster";
import DashboardPage from "@/app/(app)/dashboard/page";
import { TonightsPick } from "@/components/features/dashboard/TonightsPick";
import { queryKeys } from "@/lib/queries";
import { toISODate } from "@/lib/dates";
import type { InventoryItem, RecipeSummary } from "@/lib/types";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const recipe = (id: number, title: string): RecipeSummary => ({
  id, title, image: "", description: `About ${title}`, ready_in_minutes: 30, servings: 2, diets: [],
  used: ["rice"], missing: [], is_favourite: false,
});
const item = (id: number, name: string, days: number | null): InventoryItem => ({
  id, name, quantity: "1", unit: "", category: "Fridge", expiry_date: null, days_left: days, expires_soon: false, date_added: "",
});

type Routes = Record<string, () => Response>;
function mockFetch(routes: Routes) {
  const calls: { url: string; method: string; body?: string }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    const key = Object.keys(routes).find((k) => `${method} ${url}`.startsWith(k));
    return key ? routes[key]() : json({ error: { code: "x", message: "no route", fields: {} } }, 404);
  });
  return calls;
}

const baseRoutes = (): Routes => ({
  "GET /api/recipes/suggestions/": () =>
    json({ results: [recipe(1, "Garlic pasta"), recipe(2, "Veg curry"), recipe(3, "Egg fried rice"), recipe(4, "Tomato soup")], reason: null }),
  "GET /api/inventory/": () => json([item(1, "Spinach", 2), item(2, "Milk", 0), item(3, "Rice", 40)]),
  "GET /api/plans/": () => json({ week_start: "2026-10-26", days: [] }),
  "GET /api/stats/": () => json({ used_this_month: 12, expired_this_month: 1, meals_planned_this_week: 3, items_in_kitchen: 20, expiring_soon: 2 }),
  "GET /api/note/": () => json({ note: "Buy basil", updated_at: "" }),
  "PUT /api/note/": () => json({ note: "x", updated_at: "" }),
});

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Toaster>{ui}</Toaster></QueryClientProvider>);
}

beforeEach(() => {
  document.cookie = "csrftoken=t; path=/";
});
afterEach(() => vi.useRealTimers());

describe("Dashboard", () => {
  it("shows the hero pick, more ideas and expiring items", async () => {
    mockFetch(baseRoutes());
    wrap(<DashboardPage />);
    expect(await screen.findByRole("heading", { name: "Garlic pasta" })).toBeInTheDocument();
    const more = screen.getByRole("heading", { name: "More ideas" });
    const section = more.closest("section")!;
    expect(within(section).getAllByRole("article")).toHaveLength(3);
    expect(await screen.findByText("Expires today")).toBeInTheDocument();
    expect(screen.getByText("2 days left")).toBeInTheDocument();
    expect(screen.queryByText("40 days left")).not.toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("invites more ingredients when the kitchen is too bare", async () => {
    mockFetch({ ...baseRoutes(), "GET /api/recipes/suggestions/": () => json({ results: [], reason: "need_more_ingredients" }) });
    wrap(<DashboardPage />);
    expect(await screen.findByRole("heading", { name: "Add a few more ingredients" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add ingredients" })).toHaveAttribute("href", "/kitchen");
    expect(screen.getByRole("link", { name: "Quick start" })).toHaveAttribute("href", "/onboarding");
    expect(screen.queryByRole("heading", { name: "More ideas" })).not.toBeInTheDocument();
  });

  it("autosaves notes 800ms after typing stops", async () => {
    const calls = mockFetch(baseRoutes());
    wrap(<DashboardPage />);
    const box = await screen.findByLabelText("Your notes");
    await waitFor(() => expect(box).toHaveValue("Buy basil"));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(box, "!");
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    vi.useRealTimers();
    await waitFor(() => expect(calls.find((c) => c.method === "PUT" && c.url === "/api/note/")?.body).toBe(JSON.stringify({ note: "Buy basil!" })));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("keeps other widgets when suggestions fail", async () => {
    mockFetch({ ...baseRoutes(), "GET /api/recipes/suggestions/": () => json({ error: { code: "network", message: "Recipes are down", fields: {} } }, 503) });
    wrap(<DashboardPage />);
    expect(await screen.findByText("Recipes are down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(await screen.findByText("Expires today")).toBeInTheDocument();
  });
});

describe("AddToPlanDialog", () => {
  it("posts the plan for today at dinner with missing items", async () => {
    const calls = mockFetch({
      "POST /api/plans/": () => json({ id: 1, recipe_id: 9, recipe_title: "Soup", recipe_image: "", description: "", planned_date: toISODate(new Date()), slot: "dinner", added_to_shopping: 2 }, 201),
    });
    const onOpenChange = vi.fn();
    wrap(
      <AddToPlanDialog recipe={{ id: 9, title: "Soup" }} open onOpenChange={onOpenChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add to plan" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.url).toBe("/api/plans/");
    expect(JSON.parse(post.body!)).toEqual({ recipe_id: 9, planned_date: toISODate(new Date()), slot: "dinner", add_missing: true });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

describe("TonightsPick", () => {
  it("plans the recipe that was clicked even if suggestions refetch underneath the dialog", async () => {
    let first = 1;
    const routes = baseRoutes();
    routes["GET /api/recipes/suggestions/"] = () => json({ results: [recipe(first, `Recipe ${first}`)], reason: null });
    routes["POST /api/plans/"] = () => json({ id: 1, recipe_id: 1, recipe_title: "x", recipe_image: "", description: "", planned_date: toISODate(new Date()), slot: "dinner", added_to_shopping: 0 }, 201);
    const calls = mockFetch(routes);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><Toaster><TonightsPick /></Toaster></QueryClientProvider>);
    await userEvent.click(await screen.findByRole("button", { name: /add to plan/i }));
    const dialog = await screen.findByRole("dialog", { name: "Add to plan" });
    first = 2;
    await act(async () => { await qc.refetchQueries({ queryKey: queryKeys.suggestions }); });
    await userEvent.click(within(dialog).getByRole("button", { name: "Add to plan" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    expect(JSON.parse(calls.find((c) => c.method === "POST")!.body!).recipe_id).toBe(1);
  });
});
