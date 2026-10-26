import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FavouritesPage from "@/app/(app)/favourites/page";
import RecipesPage from "@/app/(app)/recipes/page";
import { Toaster } from "@/components/ui/Toaster";
import type { Favourite, RecipeSummary } from "@/lib/types";

// A tiny URL store so `router.replace` really changes what `useSearchParams` returns.
const nav = vi.hoisted(() => {
  let search = "";
  const listeners = new Set<() => void>();
  return {
    get: () => search,
    set: (s: string) => {
      search = s;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    replace: vi.fn(),
  };
});

vi.mock("next/navigation", async () => {
  const React = await import("react");
  return {
    useRouter: () => ({ push: vi.fn(), replace: nav.replace }),
    usePathname: () => "/recipes",
    useSearchParams: () => {
      const s = React.useSyncExternalStore(nav.subscribe, nav.get, nav.get);
      return React.useMemo(() => new URLSearchParams(s), [s]);
    },
  };
});

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const recipe = (id: number, title: string): RecipeSummary => ({
  id, title, image: "", description: `About ${title}`, ready_in_minutes: 30, servings: 2, diets: [],
  used: [], missing: [], is_favourite: false,
});
const fav = (id: number, title: string): Favourite => ({ recipe_id: id, title, image: "", description: `About ${title}`, created_at: "" });

function mockFetch(routes: Record<string, () => Response>) {
  const calls: { url: string; method: string }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method });
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
  nav.set("");
  nav.replace.mockImplementation((url: string) => nav.set(url.split("?")[1] ?? ""));
  nav.replace.mockClear();
});
afterEach(() => nav.replace.mockReset());

const results = () => json({ results: [recipe(1, "Tomato soup"), recipe(2, "Leek soup")], reason: null });

describe("Recipes page", () => {
  it("typing in search updates the URL and fetches after the debounce", async () => {
    const calls = mockFetch({ "GET /api/recipes/search/": results });
    const user = userEvent.setup();
    wrap(<RecipesPage />);
    await screen.findByText("Tomato soup");
    await user.type(screen.getByLabelText("Search recipes"), "soup");
    expect(nav.replace).not.toHaveBeenCalled();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/recipes?q=soup", { scroll: false }), { timeout: 2000 });
    await waitFor(() => expect(calls.some((c) => c.url === "/api/recipes/search/?q=soup")).toBe(true));
  });

  it("toggling Matches my kitchen adds matches_kitchen=1", async () => {
    const calls = mockFetch({ "GET /api/recipes/search/": results });
    wrap(<RecipesPage />);
    await screen.findByText("Tomato soup");
    await userEvent.click(screen.getByRole("switch", { name: "Matches my kitchen" }));
    expect(nav.replace).toHaveBeenCalledWith("/recipes?matches_kitchen=1", { scroll: false });
    await waitFor(() => expect(calls.some((c) => c.url === "/api/recipes/search/?matches_kitchen=1")).toBe(true));
    expect(screen.getByRole("switch", { name: "Matches my kitchen" })).toHaveAttribute("aria-checked", "true");
  });

  it("reads the initial URL into the controls", async () => {
    nav.set("matches_kitchen=1&type=soup&cuisine=italian");
    mockFetch({ "GET /api/recipes/search/": results });
    wrap(<RecipesPage />);
    expect(screen.getByRole("switch", { name: "Matches my kitchen" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Soup" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Cuisine")).toHaveValue("italian");
    await screen.findByText("Tomato soup");
  });

  it("announces the count and opens Add to plan from a card", async () => {
    mockFetch({ "GET /api/recipes/search/": results });
    wrap(<RecipesPage />);
    expect(await screen.findByText("2 recipes")).toBeInTheDocument();
    const card = screen.getAllByRole("article")[0];
    await userEvent.click(within(card).getByRole("button", { name: "Add to plan" }));
    expect(await screen.findByRole("dialog", { name: "Add to plan" })).toBeInTheDocument();
  });

  it("shows an empty state whose Clear filters resets the URL", async () => {
    nav.set("q=zzz&type=soup");
    mockFetch({ "GET /api/recipes/search/": () => json({ results: [], reason: null }) });
    wrap(<RecipesPage />);
    expect(await screen.findByText("No recipes match")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/recipes", { scroll: false });
    expect(nav.get()).toBe("");
    await waitFor(() => expect(screen.getByLabelText("Search recipes")).toHaveValue(""));
  });

  it("shows the stale notice when the response is cached", async () => {
    mockFetch({
      "GET /api/recipes/search/": () =>
        new Response(JSON.stringify({ results: [recipe(1, "Tomato soup")], reason: null }), {
          status: 200, headers: { "Content-Type": "application/json", "X-Stale": "true" },
        }),
    });
    wrap(<RecipesPage />);
    expect(await screen.findByText(/live results are taking a break/)).toBeInTheDocument();
  });

  it("shows an error card when the request fails", async () => {
    mockFetch({ "GET /api/recipes/search/": () => json({ error: { code: "x", message: "Recipes are down", fields: {} } }, 500) });
    wrap(<RecipesPage />);
    expect(await screen.findByText("Recipes are down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("Favourites page", () => {
  it("shows the empty state with a Browse recipes action", async () => {
    mockFetch({ "GET /api/favourites/": () => json([]) });
    wrap(<FavouritesPage />);
    expect(await screen.findByText("No favourites yet")).toBeInTheDocument();
    expect(screen.getByText("Tap the heart on any recipe to keep it here.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse recipes" })).toHaveAttribute("href", "/recipes");
  });

  it("removes a card optimistically when unfavourited", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "DELETE") {
        await gate;
        return new Response(null, { status: 204 });
      }
      if (url.startsWith("/api/favourites/")) return json([fav(1, "Tomato soup"), fav(2, "Leek soup")]);
      return json({ results: [], reason: null });
    });
    wrap(<FavouritesPage />);
    expect(await screen.findByText("Tomato soup")).toBeInTheDocument();
    const card = screen.getByText("Tomato soup").closest("article")!;
    await userEvent.click(within(card).getByRole("button", { name: "Remove from favourites" }));
    await waitFor(() => expect(screen.queryByText("Tomato soup")).not.toBeInTheDocument());
    expect(screen.getByText("Leek soup")).toBeInTheDocument();
    await act(async () => release());
  });
});
