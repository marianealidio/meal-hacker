import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "@/app/(app)/profile/page";
import { Toaster } from "@/components/ui/Toaster";
import type { Me } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const me: Me = { id: 1, username: "cook", display_name: "Cook", diet: "", intolerances: [], onboarded: true, is_demo: false };

function setup(user: Me, extra: Record<string, () => Response> = {}) {
  const calls: { url: string; method: string; body?: string }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    const key = Object.keys(extra).find((k) => `${method} ${url}`.startsWith(k));
    if (key) return extra[key]();
    if (method === "GET" && url === "/api/auth/me/") return json(user);
    if (method === "PATCH" && url === "/api/auth/me/") return json({ ...user, ...JSON.parse(init!.body as string) });
    return json({ error: { code: "x", message: "no route", fields: {} } }, 404);
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Toaster><ProfilePage /></Toaster>
    </QueryClientProvider>,
  );
  return calls;
}

afterEach(() => vi.restoreAllMocks());

describe("profile page", () => {
  it("saves display name, diet and intolerances", async () => {
    const calls = setup(me);
    const u = userEvent.setup();
    const name = await screen.findByLabelText("Display name");
    await u.clear(name);
    await u.type(name, "Chef");
    await u.selectOptions(screen.getByLabelText("Diet"), "gluten free");
    await u.click(screen.getByRole("checkbox", { name: "Tree nut" }));
    await u.click(screen.getByRole("checkbox", { name: "Dairy" }));
    await u.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(JSON.parse(patch.body!)).toEqual({ display_name: "Chef", diet: "gluten free", intolerances: ["dairy", "tree nut"] });
    expect(await screen.findByText("Profile saved")).toBeInTheDocument();
  });

  it("shows the read-only note for the demo user and no forms", async () => {
    setup({ ...me, username: "demo", is_demo: true });
    expect(await screen.findByText("you're in the demo kitchen")).toBeInTheDocument();
    expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change password" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
    expect(screen.getAllByRole("button", { name: "Log out" })).toHaveLength(1);
  });

  it("renders password field errors from the envelope", async () => {
    setup(me, {
      "POST /api/auth/password/": () =>
        json({ error: { code: "validation", message: "Invalid", fields: { old_password: ["Wrong password."], new_password: ["Too short."] } } }, 400),
    });
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText("Current password"), "old");
    await u.type(screen.getByLabelText("New password"), "x");
    await u.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Wrong password.")).toBeInTheDocument();
    expect(screen.getByText("Too short.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Current password")).toHaveFocus());
  });
});
