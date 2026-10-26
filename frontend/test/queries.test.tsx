import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/Toaster";
import { queryKeys, useToggleFavourite, useUpdateShopping } from "@/lib/queries";
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
  });
});
