import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/Toaster";
import { queryKeys, useShopping, useToggleFavourite, useUpdateShopping } from "@/lib/queries";
import type { RecipeSummary, ShoppingItem } from "@/lib/types";

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}><Toaster>{children}</Toaster></QueryClientProvider>
  );
  return { qc, wrapper };
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

describe("optimistic mutations", () => {
  it("rolls back a shopping tick when the request fails", async () => {
    document.cookie = "csrftoken=t; path=/";
    const { qc, wrapper } = setup();
    const item: ShoppingItem = { id: 1, ingredient_name: "Milk", quantity: "", aisle: "Dairy", checked: false, source: "manual", meal_plan: null, date_added: "" };
    qc.setQueryData(queryKeys.shopping, [item]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: { code: "network", message: "Down", fields: {} } }, 500));
    const { result } = renderHook(() => useUpdateShopping(), { wrapper });
    act(() => result.current.mutate({ id: 1, patch: { checked: true } }));
    expect((qc.getQueryData(queryKeys.shopping) as ShoppingItem[])[0].checked).toBe(true);
    await waitFor(() => expect((qc.getQueryData(queryKeys.shopping) as ShoppingItem[])[0].checked).toBe(false));
  });

  it("flips is_favourite across cached recipe lists", async () => {
    document.cookie = "csrftoken=t; path=/";
    const { qc, wrapper } = setup();
    const r = { id: 7, is_favourite: false } as RecipeSummary;
    qc.setQueryData(queryKeys.suggestions, { data: { results: [r], reason: null }, stale: false });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ recipe_id: 7, title: "x", image: "", description: "", created_at: "" }, 201));
    const { result } = renderHook(() => useToggleFavourite(), { wrapper });
    act(() => result.current.mutate({ recipeId: 7, isFavourite: false }));
    const cached = qc.getQueryData(queryKeys.suggestions) as { data: { results: RecipeSummary[] } };
    expect(cached.data.results[0].is_favourite).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back a favourite toggle when the request fails", async () => {
    document.cookie = "csrftoken=t; path=/";
    const { qc, wrapper } = setup();
    const r = { id: 7, is_favourite: false } as RecipeSummary;
    qc.setQueryData(queryKeys.suggestions, { data: { results: [r], reason: null }, stale: false });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ error: { code: "network", message: "Down", fields: {} } }, 500));
    const { result } = renderHook(() => useToggleFavourite(), { wrapper });
    act(() => result.current.mutate({ recipeId: 7, isFavourite: false }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = qc.getQueryData(queryKeys.suggestions) as { data: { results: RecipeSummary[] } };
    expect(cached.data.results[0].is_favourite).toBe(false);
  });

  it("keeps the optimistic write while a read for the same key is in flight", async () => {
    document.cookie = "csrftoken=t; path=/";
    const { qc, wrapper } = setup();
    const item: ShoppingItem = { id: 1, ingredient_name: "Milk", quantity: "", aisle: "Dairy", checked: false, source: "manual", meal_plan: null, date_added: "" };
    qc.setQueryData(queryKeys.shopping, [item]);
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>(() => {}));
    const { result } = renderHook(() => ({ list: useShopping(), upd: useUpdateShopping() }), { wrapper });
    await waitFor(() => expect(result.current.list.isFetching).toBe(true));
    act(() => result.current.upd.mutate({ id: 1, patch: { checked: true } }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect((qc.getQueryData(queryKeys.shopping) as ShoppingItem[])[0].checked).toBe(true);
  });

  it("refetches the list after a failed optimistic update", async () => {
    document.cookie = "csrftoken=t; path=/";
    const { qc, wrapper } = setup();
    const item: ShoppingItem = { id: 1, ingredient_name: "Milk", quantity: "", aisle: "Dairy", checked: false, source: "manual", meal_plan: null, date_added: "" };
    qc.setQueryData(queryKeys.shopping, [item]);
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) =>
      (init as RequestInit)?.method === "PATCH"
        ? json({ error: { code: "network", message: "Down", fields: {} } }, 500)
        : json([item]));
    const gets = () => f.mock.calls.filter((c) => ((c[1] as RequestInit)?.method ?? "GET") === "GET").length;
    const { result } = renderHook(() => ({ list: useShopping(), upd: useUpdateShopping() }), { wrapper });
    await waitFor(() => expect(result.current.list.isFetching).toBe(false));
    const before = gets();
    act(() => result.current.upd.mutate({ id: 1, patch: { checked: true } }));
    await waitFor(() => expect(result.current.upd.isError).toBe(true));
    await waitFor(() => expect(gets()).toBeGreaterThan(before));
  });
});

describe("add plan toast", () => {
  it.each([[1, "Added to Mon 26 Oct · 1 item on your list"], [3, "Added to Mon 26 Oct · 3 items on your list"]])(
    "pluralises %s", async (n, title) => {
      document.cookie = "csrftoken=t; path=/";
      const { wrapper } = setup();
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ id: 1, planned_date: "2026-10-26", added_to_shopping: n }, 201));
      const { useAddPlan } = await import("@/lib/queries");
      const { render, screen } = await import("@testing-library/react");
      function Probe() {
        const m = useAddPlan();
        return <button onClick={() => m.mutate({ recipe_id: 1, planned_date: "2026-10-26", slot: "dinner" })}>go</button>;
      }
      render(<Probe />, { wrapper });
      screen.getByText("go").click();
      expect(await screen.findByText(title)).toBeInTheDocument();
    });
});
