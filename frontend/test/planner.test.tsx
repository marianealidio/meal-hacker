import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlannerPage from "@/app/(app)/planner/page";
import RecipesPage from "@/app/(app)/recipes/page";
import { Toaster } from "@/components/ui/Toaster";
import type { MealPlan, Week } from "@/lib/types";

const nav = vi.hoisted(() => {
  let search = "";
  const listeners = new Set<() => void>();
  const set = (s: string) => {
    search = s;
    listeners.forEach((l) => l());
  };
  return {
    get: () => search,
    set,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    push: vi.fn(),
    replace: vi.fn(),
  };
});

vi.mock("next/navigation", async () => {
  const React = await import("react");
  return {
    useRouter: () => ({ push: nav.push, replace: nav.replace }),
    usePathname: () => "/planner",
    useSearchParams: () => {
      const s = React.useSyncExternalStore(nav.subscribe, nav.get, nav.get);
      return React.useMemo(() => new URLSearchParams(s), [s]);
    },
  };
});

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const meal = (id: number, title: string, planned_date: string, slot: MealPlan["slot"]): MealPlan => ({
  id, recipe_id: id * 10, recipe_title: title, recipe_image: "", description: "", planned_date, slot,
});

const DATES = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"];
const week = (meals: MealPlan[], start = "2026-10-26"): Week => ({
  week_start: start,
  days: DATES.map((date) => ({ date, meals: meals.filter((m) => m.planned_date === date) })),
});

type Call = { url: string; method: string; body?: string };
function mockFetch(routes: Record<string, () => Response | Promise<Response>>) {
  const calls: Call[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    const key = Object.keys(routes).find((k) => `${method} ${url}`.startsWith(k));
    return key ? routes[key]() : json({ error: { code: "x", message: "no route", fields: {} } }, 404);
  });
  return calls;
}

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Toaster>{ui}</Toaster></QueryClientProvider>);
}

beforeEach(() => {
  document.cookie = "csrftoken=t; path=/";
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 28, 12) });
  nav.set("week=2026-10-28");
  nav.push.mockImplementation((url: string) => nav.set(url.split("?")[1] ?? ""));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  nav.push.mockReset();
});

const MEALS = [
  meal(1, "Porridge", "2026-10-26", "breakfast"),
  meal(2, "Lentil soup", "2026-10-28", "lunch"),
  meal(3, "Pasta bake", "2026-10-28", "dinner"),
  meal(4, "Second dinner", "2026-10-28", "dinner"),
];

describe("Planner page", () => {
  it("normalises the week param to its Monday and shows the range", async () => {
    const calls = mockFetch({ "GET /api/plans/": () => json(week(MEALS)) });
    wrap(<PlannerPage />);
    await screen.findByText("Porridge");
    expect(calls[0].url).toBe("/api/plans/?week=2026-10-26");
    expect(screen.getByText("26 Oct – 1 Nov 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Planner" })).toBeInTheDocument();
  });

  it("next week updates the URL", async () => {
    mockFetch({ "GET /api/plans/": () => json(week([])) });
    wrap(<PlannerPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Next week" }));
    expect(nav.push).toHaveBeenCalledWith("/planner?week=2026-11-02", { scroll: false });
    await waitFor(() => expect(screen.getByText("2 Nov – 8 Nov 2026")).toBeInTheDocument());
  });

  it("puts meals in the right day and slot, stacking several, and marks today", async () => {
    mockFetch({ "GET /api/plans/": () => json(week(MEALS)) });
    wrap(<PlannerPage />);
    await screen.findByText("Porridge");
    const wed = screen.getByRole("region", { name: "Wednesday 28 October" });
    expect(within(within(wed).getByRole("group", { name: "Lunch" })).getByText("Lentil soup")).toBeInTheDocument();
    const dinner = within(wed).getByRole("group", { name: "Dinner" });
    expect(within(dinner).getAllByRole("listitem")).toHaveLength(2);
    const mon = screen.getByRole("region", { name: "Monday 26 October" });
    expect(within(within(mon).getByRole("group", { name: "Breakfast" })).getByText("Porridge")).toBeInTheDocument();
    expect(within(wed).getByText("Today")).toBeInTheDocument();
    expect(within(mon).queryByText("Today")).not.toBeInTheDocument();
    expect(screen.queryByText(/an empty week/)).not.toBeInTheDocument();
  });

  it("remove deletes optimistically with a toast", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const calls = mockFetch({
      "DELETE /api/plans/2/": async () => {
        await gate;
        return new Response(null, { status: 204 });
      },
      "GET /api/plans/": () => json(week(MEALS)),
    });
    wrap(<PlannerPage />);
    await screen.findByText("Lentil soup");
    await userEvent.click(screen.getByRole("button", { name: "Actions for Lentil soup" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByText("Lentil soup")).not.toBeInTheDocument());
    expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/plans/2/")).toBe(true);
    release();
    expect(await screen.findByText("Removed from your plan")).toBeInTheDocument();
  });

  it("move sends a PATCH with the new date and slot", async () => {
    const calls = mockFetch({
      "PATCH /api/plans/3/": () => json(meal(3, "Pasta bake", "2026-10-30", "lunch")),
      "GET /api/plans/": () => json(week(MEALS)),
    });
    wrap(<PlannerPage />);
    await screen.findByText("Pasta bake");
    await userEvent.click(screen.getByRole("button", { name: "Actions for Pasta bake" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Move/ }));
    const dialog = await screen.findByRole("dialog");
    const date = within(dialog).getByLabelText("Date");
    await userEvent.clear(date);
    await userEvent.type(date, "2026-10-30");
    await userEvent.selectOptions(within(dialog).getByLabelText("Meal"), "lunch");
    await userEvent.click(within(dialog).getByRole("button", { name: "Move meal" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(JSON.parse(patch.body!)).toEqual({ planned_date: "2026-10-30", slot: "lunch" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("empty slots link to recipes with the date and slot", async () => {
    mockFetch({ "GET /api/plans/": () => json(week(MEALS)) });
    wrap(<PlannerPage />);
    await screen.findByText("Porridge");
    const link = screen.getByRole("link", { name: "Add lunch on Monday 26 October" });
    expect(link).toHaveAttribute("href", "/recipes?plan_date=2026-10-26&plan_slot=lunch");
    expect(screen.queryByRole("link", { name: "Add lunch on Wednesday 28 October" })).not.toBeInTheDocument();
  });

  it("keeps the board visible with a note when the week is empty", async () => {
    mockFetch({ "GET /api/plans/": () => json(week([])) });
    wrap(<PlannerPage />);
    expect(await screen.findByText("an empty week — add something tasty")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Add breakfast on/ })).toHaveLength(7);
  });

  it("shows an error card that retries", async () => {
    let fail = true;
    mockFetch({
      "GET /api/plans/": () => (fail ? json({ error: { code: "x", message: "Planner is down", fields: {} } }, 500) : json(week(MEALS))),
    });
    wrap(<PlannerPage />);
    expect(await screen.findByText("Planner is down")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Porridge")).toBeInTheDocument();
  });
});

describe("Recipes page plan defaults", () => {
  it("pre-fills the add-to-plan dialog from plan_date and plan_slot", async () => {
    nav.set("plan_date=2026-10-26&plan_slot=lunch");
    mockFetch({
      "GET /api/recipes/search/": () =>
        json({ results: [{ id: 1, title: "Tomato soup", image: "", description: "", ready_in_minutes: 30, servings: 2, diets: [], used: [], missing: [], is_favourite: false }], reason: null }),
    });
    wrap(<RecipesPage />);
    await userEvent.click(await screen.findByRole("button", { name: /Add to plan/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2026-10-26");
    expect(within(dialog).getByRole("radio", { name: "Lunch" })).toBeChecked();
  });
});
