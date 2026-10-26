import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/app/(app)/onboarding/page";
import { Toaster } from "@/components/ui/Toaster";
import type { Me } from "@/lib/types";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn() }) }));

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const me: Me = { id: 1, username: "cook", display_name: "Cook", diet: "", intolerances: [], onboarded: false, is_demo: false };

function setup(user: Me = me, failPost?: number) {
  let posts = 0;
  const calls: { url: string; method: string; body?: string }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    if (method === "GET" && url === "/api/auth/me/") return json(user);
    if (method === "PATCH") return json({ ...user, onboarded: true });
    if (method === "POST" && url === "/api/inventory/" && ++posts === failPost) {
      return json({ error: { code: "boom", message: "Server hiccup", fields: {} } }, 500);
    }
    if (method === "POST" && url === "/api/inventory/") return json({ id: 1, name: JSON.parse(init!.body as string).name }, 201);
    return json({}, 200);
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Toaster><OnboardingPage /></Toaster>
    </QueryClientProvider>,
  );
  return calls;
}

afterEach(() => {
  vi.restoreAllMocks();
  replace.mockClear();
});

describe("onboarding", () => {
  it("adds the selected chips with their categories, marks onboarded and navigates", async () => {
    const calls = setup();
    const u = userEvent.setup();
    const eggs = await screen.findByRole("button", { name: "eggs" });
    await u.click(eggs);
    expect(eggs).toHaveAttribute("aria-pressed", "true");
    await u.click(screen.getByRole("button", { name: "rice" }));
    await u.click(screen.getByRole("button", { name: "frozen peas" }));
    await u.click(screen.getByRole("button", { name: "Add 3 ingredients" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    const posts = calls.filter((c) => c.method === "POST").map((c) => JSON.parse(c.body!));
    expect(posts.map((p) => [p.name, p.category])).toEqual([["eggs", "Fridge"], ["rice", "Pantry"], ["frozen peas", "Freezer"]]);
    expect(posts[0].expiry_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(posts[1].expiry_date).toBeUndefined();
    const patchAt = calls.findIndex((c) => c.method === "PATCH");
    expect(JSON.parse(calls[patchAt].body!)).toEqual({ onboarded: true });
    expect(patchAt).toBeGreaterThan(calls.findLastIndex((c) => c.method === "POST"));
    expect(await screen.findByText("Your kitchen is stocked")).toBeInTheDocument();
  });

  it("skip marks onboarded and navigates", async () => {
    const calls = setup();
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: "Skip for now" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
    expect(JSON.parse(calls.find((c) => c.method === "PATCH")!.body!)).toEqual({ onboarded: true });
  });

  it("sends demo users to the dashboard", async () => {
    setup({ ...me, is_demo: true, onboarded: true });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });
});

describe("onboarding retry", () => {
  it("does not re-add starters that already succeeded", async () => {
    const calls = setup(me, 2);
    const u = userEvent.setup();
    for (const n of ["eggs", "rice", "frozen peas"]) await u.click(await screen.findByRole("button", { name: n }));
    await u.click(screen.getByRole("button", { name: "Add 3 ingredients" }));
    expect(await screen.findByText("Added 1 of 3. Try again for the rest.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "eggs" })).toHaveAttribute("aria-pressed", "false");
    await u.click(await screen.findByRole("button", { name: "Add 2 ingredients" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    const names = calls.filter((c) => c.method === "POST").map((c) => JSON.parse(c.body!).name);
    expect(names).toEqual(["eggs", "rice", "rice", "frozen peas"]);
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(1);
  });

  it("disables Add while skipping", async () => {
    let release = () => {};
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if ((init?.method ?? "GET") === "GET") return json(me);
      if (url === "/api/auth/me/") await new Promise<void>((r) => (release = r));
      return json({ ...me, onboarded: true });
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Toaster><OnboardingPage /></Toaster>
      </QueryClientProvider>,
    );
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: "eggs" }));
    await u.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(screen.getByRole("button", { name: "Add 1 ingredient" })).toBeDisabled();
    release();
  });
});
