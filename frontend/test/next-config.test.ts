import { describe, expect, it } from "vitest";
import config from "../next.config";

describe("next.config", () => {
  it("does not redirect trailing slashes (Django needs them)", () => {
    expect(config.skipTrailingSlashRedirect).toBe(true);
  });

  it("rewrites /api paths to the backend with a trailing slash", async () => {
    const rules = await config.rewrites!();
    const list = Array.isArray(rules) ? rules : [...(rules.beforeFiles ?? []), ...(rules.afterFiles ?? []), ...(rules.fallback ?? [])];
    const withSlash = list.find((r) => r.source === "/api/:path*/");
    const withoutSlash = list.find((r) => r.source === "/api/:path*");
    expect(withSlash?.destination).toMatch(/\/api\/:path\*\/$/);
    expect(withoutSlash?.destination).toMatch(/\/api\/:path\*\/$/);
    expect(list.indexOf(withSlash!)).toBeLessThan(list.indexOf(withoutSlash!));
  });

  it("rewrites /admin paths to the backend with a trailing slash, slash rule first", async () => {
    const rules = await config.rewrites!();
    const list = Array.isArray(rules) ? rules : [...(rules.beforeFiles ?? []), ...(rules.afterFiles ?? []), ...(rules.fallback ?? [])];
    const withSlash = list.find((r) => r.source === "/admin/:path*/");
    const withoutSlash = list.find((r) => r.source === "/admin/:path*");
    expect(withSlash?.destination).toMatch(/\/admin\/:path\*\/$/);
    expect(withoutSlash?.destination).toMatch(/\/admin\/:path\*\/$/);
    expect(list.indexOf(withSlash!)).toBeLessThan(list.indexOf(withoutSlash!));
    expect(list.some((r) => r.source === "/static/:path*")).toBe(true);
  });

  it("allows remote images from Unsplash and Spoonacular only", () => {
    const hosts = (config.images?.remotePatterns ?? []).map((p) => (typeof p === "object" && "hostname" in p ? p.hostname : ""));
    expect(hosts.sort()).toEqual(["images.unsplash.com", "img.spoonacular.com"]);
  });
});
