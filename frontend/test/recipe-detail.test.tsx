import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecipeDetailPage from "@/app/(app)/recipes/[id]/page";
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
  id: 7, title: "Lemon Pasta", image: "", description: "Bright and quick.", ready_in_minutes: 25, servings: 2,
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
    if (method === "POST" && url.includes("/api/shopping/")) return json({ id: 1 }, 201);
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

  it("adds each missing ingredient to the shopping list", async () => {
    const calls = mockFetch();
    wrap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Add 2 missing to shopping list" }));
    await waitFor(() => expect(calls.filter((c) => c.method === "POST")).toHaveLength(2));
    expect(calls.find((c) => c.method === "POST")?.body).toContain("Produce");
    expect(await screen.findByText("Added 2 items to your list")).toBeInTheDocument();
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
    const closers = screen.getAllByRole("button", { name: "Close" });
    await user.click(closers[closers.length - 1]);
    await waitFor(() => expect(release).toHaveBeenCalled());
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
