import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, apiFetch } from "@/lib/api";

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

beforeEach(() => {
  vi.restoreAllMocks();
  document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

describe("apiFetch", () => {
  it("rejects paths without a trailing slash", async () => {
    await expect(apiFetch("/api/inventory")).rejects.toThrow("API paths must end with /");
  });

  it("allows query strings after the slash", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json([]));
    await apiFetch("/api/inventory/?category=Fridge");
    expect(f.mock.calls[0][0]).toBe("/api/inventory/?category=Fridge");
  });

  it("fetches a CSRF cookie before the first unsafe request and sends it", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url) === "/api/csrf/") {
        document.cookie = "csrftoken=abc123; path=/";
        return json({ csrfToken: "abc123" });
      }
      return json({ id: 1 }, 201);
    });
    await apiFetch("/api/inventory/", { method: "POST", body: { name: "milk" } });
    expect(f.mock.calls[0][0]).toBe("/api/csrf/");
    const init = f.mock.calls[1][1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-CSRFToken"]).toBe("abc123");
    expect(init.credentials).toBe("same-origin");
    expect(init.body).toBe(JSON.stringify({ name: "milk" }));
  });

  it("re-reads the CSRF cookie on every request (Django rotates it on login)", async () => {
    document.cookie = "csrftoken=first; path=/";
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({}, 200));
    await apiFetch("/api/auth/login/", { method: "POST", body: {} });
    document.cookie = "csrftoken=second; path=/";
    await apiFetch("/api/auth/logout/", { method: "POST" });
    const tokens = f.mock.calls.map((c) => ((c[1] as RequestInit).headers as Record<string, string>)["X-CSRFToken"]);
    expect(tokens).toEqual(["first", "second"]);
  });

  it("parses the error envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json({ error: { code: "invalid", message: "Some fields need fixing.", fields: { name: ["Enter an ingredient name."] } } }, 400));
    const err = await apiFetch("/api/inventory/").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: "invalid", fields: { name: ["Enter an ingredient name."] } });
  });

  it("turns HTML error pages into a friendly network error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>502</html>", { status: 502, headers: { "Content-Type": "text/html" } }));
    const err = await apiFetch("/api/stats/").catch((e) => e);
    expect(err).toMatchObject({ status: 502, code: "network" });
    expect(err.message).toMatch(/waking up/);
  });

  it("turns a rejected fetch into a network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/api/stats/")).rejects.toMatchObject({ status: 0, code: "network" });
  });

  it("reports stale data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ results: [], reason: null }, 200, { "X-Stale": "true" }));
    const r = await apiFetch("/api/recipes/suggestions/");
    expect(r.stale).toBe(true);
  });

  it("handles 204", async () => {
    document.cookie = "csrftoken=t; path=/";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.deleteInventory(3)).resolves.toBeUndefined();
  });

  it("endpoint helpers use trailing-slash paths", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({}));
    document.cookie = "csrftoken=t; path=/";
    await api.week("2026-10-26");
    await api.recipe(716429);
    await api.shoppingToInventory(5, { category: "Fridge", expiry_date: null });
    expect(f.mock.calls.map((c) => c[0])).toEqual([
      "/api/plans/?week=2026-10-26", "/api/recipes/716429/", "/api/shopping/5/to-inventory/",
    ]);
  });
});
