import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

const css = readFileSync(path.join(__dirname, "../app/globals.css"), "utf8");

const TOKENS: Record<string, string> = {
  "--color-cream": "#FBF6EE", "--color-paper": "#F3EBDD", "--color-card": "#FFFDF8",
  "--color-sage": "#8FA98B", "--color-sage-deep": "#34503F", "--color-sage-ink": "#1F3328",
  "--color-sage-tint": "#DFE8DC", "--color-coral": "#E8836B", "--color-coral-deep": "#A3472F",
  "--color-coral-tint": "#F7DDD5", "--color-coral-tint-ink": "#8A3B29", "--color-blush": "#F4C9C0",
  "--color-butter": "#F2D08A", "--color-butter-ink": "#7A5A10", "--color-ink": "#2A2A26",
  "--color-muted": "#5C5C55", "--color-line": "#E6DCCB",
};

describe("design tokens", () => {
  it.each(Object.entries(TOKENS))("%s is %s", (name, hex) => {
    expect(css.toUpperCase()).toContain(`${name.toUpperCase()}: ${hex.toUpperCase()}`);
  });

  it("disables animation for reduced motion", () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it("has a visible focus ring", () => {
    expect(css).toMatch(/:focus-visible/);
  });

  it("cn joins and drops falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});
