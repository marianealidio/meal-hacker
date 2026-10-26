import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: "sessionid=abc" }) }));

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetModules(); });

describe("getSession", () => {
  it("defaults the backend to 127.0.0.1:8000 and forwards the cookie", async () => {
    vi.stubEnv("BACKEND_URL", "");
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1, username: "demo" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const { getSession } = await import("@/lib/session");
    await expect(getSession()).resolves.toMatchObject({ username: "demo" });
    expect(f.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/auth/me/");
    expect((f.mock.calls[0][1] as RequestInit).headers).toMatchObject({ cookie: "sessionid=abc" });
  });

  it("strips a trailing slash from BACKEND_URL", async () => {
    vi.stubEnv("BACKEND_URL", "https://api.example.com/");
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    const { getSession } = await import("@/lib/session");
    await expect(getSession()).resolves.toBeNull();
    expect(f.mock.calls[0][0]).toBe("https://api.example.com/api/auth/me/");
  });
});
