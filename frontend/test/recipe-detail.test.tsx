import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecipeDetailPage from "@/app/(app)/recipes/[id]/page";
import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/Toaster";
import type { RecipeDetail } from "@/lib/types";

const route = vi.hoisted(() => ({ id: "7" }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: route.id }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/recipes/7",
}));

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const recipe: RecipeDetail = {
  id: 7, title: "Lemon Pasta", image: "", description: "Bright and quick…", summary: "Bright and quick, with lemon, garlic and a long finish that the short description cuts off.", ready_in_minutes: 25, servings: 2,
  diets: ["vegetarian"], used: [], missing: [], is_favourite: false, cuisines: ["Italian"],
  source_url: "https://example.com/pasta",
  ingredients: [
    { name: "spaghetti", amount: 1, unit: "cup", original: "1 cup spaghetti", aisle: "Pasta", have: true },
    { name: "lemon", amount: 2, unit: "", original: "2 lemons", aisle: "Produce", have: false },
    { name: "parsley", amount: null, unit: "", original: "a handful of parsley", aisle: "Produce", have: false },
  ],
  steps: ["Boil the pasta.", "Make the sauce.", "Toss and serve."],
};

function mockFetch(detail: () => Response = () => json(recipe)) {
  const calls: { url: string; method: string; body?: string }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    if (method === "GET" && url.includes("/api/recipes/")) return detail();
    if (method === "POST" && url.includes("/api/shopping/")) {
      await new Promise((r) => setTimeout(r, 50));
      return json({ id: 1 }, 201);
    }
    return json({ error: { code: "x", message: "no route", fields: {} } }, 404);
  });
  return calls;
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Toaster><RecipeDetailPage /></Toaster></QueryClientProvider>);
}

beforeEach(() => {
  document.cookie = "csrftoken=t; path=/";
  route.id = "7";
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("recipe detail", () => {
  it("renders the title, have/missing rows and the summary", async () => {
    mockFetch();
    wrap();
    expect(await screen.findByRole("heading", { level: 1, name: "Lemon Pasta" })).toBeInTheDocument();
    expect(screen.getByText("You have this")).toBeInTheDocument();
    expect(screen.getAllByText("Missing")).toHaveLength(2);
    expect(screen.getByText("You have 1 of 3")).toBeInTheDocument();
    expect(screen.getByText(/a handful of parsley/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Original recipe/ })).toHaveAttribute("target", "_blank");
  });

  it("shows the full summary rather than the truncated description", async () => {
    mockFetch();
    wrap();
    expect(await screen.findByText(/a long finish that the short description cuts off\./)).toBeInTheDocument();
    expect(screen.queryByText("Bright and quick…")).not.toBeInTheDocument();
  });

  it("falls back to the description when there is no summary", async () => {
    mockFetch(() => json({ ...recipe, summary: undefined }));
    wrap();
    expect(await screen.findByText("Bright and quick…")).toBeInTheDocument();
  });

  it("requests the largest recipe image", async () => {
    mockFetch(() => json({ ...recipe, image: "https://img.spoonacular.com/recipes/7-556x370.jpg" }));
    wrap();
    await screen.findByRole("heading", { level: 1, name: "Lemon Pasta" });
    expect(decodeURIComponent(document.querySelector("img")!.getAttribute("src")!)).toContain("7-636x393.jpg");
  });

  it("scales amounts with the servings control", async () => {
    mockFetch();
    wrap();
    const user = userEvent.setup();
    const more = await screen.findByRole("button", { name: "More servings" });
    expect(screen.getByTestId("amount-spaghetti")).toHaveTextContent("1 cup");
    await user.click(more);
    await user.click(more);
    expect(screen.getByTestId("amount-spaghetti")).toHaveTextContent("2 cup");
  });

  it("adds each missing ingredient once, with scaled quantity and aisle", async () => {
    const calls = mockFetch();
    wrap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "More servings" }));
    await user.click(await screen.findByRole("button", { name: "More servings" }));
    const btn = screen.getByRole("button", { name: "Add 2 missing to shopping list" });
    await user.dblClick(btn);
    expect((await screen.findAllByText("Added 2 items to your list")).length).toBeGreaterThan(0);
    const bodies = calls.filter((c) => c.method === "POST").map((c) => JSON.parse(c.body ?? "{}"));
    expect(bodies).toEqual([
      { ingredient_name: "lemon", quantity: "4", aisle: "Produce" },
      { ingredient_name: "a handful of parsley", quantity: "", aisle: "Produce" },
    ]);
  });

  it("steps through cook mode with buttons and keys, holding a wake lock", async () => {
    mockFetch();
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release });
    vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { wakeLock: { request } }));
    wrap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Cook mode" }));
    expect(request).toHaveBeenCalledWith("screen");
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("Make the sauce.")).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByText("Done — enjoy!")).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    const finish = screen.getByRole("button", { name: "Finish cooking" });
    await user.click(finish);
    await waitFor(() => expect(release).toHaveBeenCalled());
  });

  it("re-acquires the wake lock when the page becomes visible again", async () => {
    mockFetch();
    const request = vi.fn().mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) });
    vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { wakeLock: { request } }));
    wrap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Cook mode" }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const vis = vi.spyOn(document, "visibilityState", "get");
    vis.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(request).toHaveBeenCalledTimes(1);
    vis.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it("moves focus to the primary button when Next becomes Finish", async () => {
    mockFetch();
    wrap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Cook mode" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Finish cooking" })).toHaveFocus();
  });

  it("keeps focus on the primary button when arrow keys reach the last step", async () => {
    mockFetch();
    wrap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Cook mode" }));
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Finish cooking" })).toHaveFocus());
  });

  it("hides cook mode when there are no steps", async () => {
    mockFetch(() => json({ ...recipe, steps: [] }));
    wrap();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: "Cook mode" })).not.toBeInTheDocument();
  });

  it("fetches a 404 recipe only once (no retries)", async () => {
    const calls = mockFetch(() => json({ error: { code: "not_found", message: "Not found.", fields: {} } }, 404));
    render(<Providers><RecipeDetailPage /></Providers>);
    expect(await screen.findByText("This recipe has gone off")).toBeInTheDocument();
    expect(calls.filter((c) => c.url.includes("/api/recipes/"))).toHaveLength(1);
  });

  it("shows the not-found state for a 404", async () => {
    mockFetch(() => json({ error: { code: "not_found", message: "Not found.", fields: {} } }, 404));
    wrap();
    expect(await screen.findByText("This recipe has gone off")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to recipes" })).toHaveAttribute("href", "/recipes");
  });

  it("shows not-found without fetching for an invalid id", async () => {
    route.id = "abc";
    const calls = mockFetch();
    wrap();
    expect(await screen.findByText("This recipe has gone off")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("shows an error card with retry for other errors", async () => {
    mockFetch(() => json({ error: { code: "server", message: "Boom", fields: {} } }, 500));
    wrap();
    expect(await screen.findByText("Boom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
