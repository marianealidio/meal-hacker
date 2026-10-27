import { describe, expect, it } from "vitest";
import { formatMinutes, scaleAmount } from "@/lib/format";

describe("format", () => {
  it.each([[null, ""], [30, "30 min"], [60, "1 hr"], [75, "1 hr 15 min"]])("formatMinutes(%s)", (m, s) => {
    expect(formatMinutes(m as number | null)).toBe(s);
  });

  it.each([
    [2, 2, 4, "4"], [1, 2, 1, "½"], [0.5, 2, 3, "¾"], [1, 3, 1, "⅓"], [250, 2, 3, "375"], [1.3, 1, 1, "1.3"], [null, 2, 4, ""],
  ])("scaleAmount(%s, %s→%s)", (a, from, to, s) => {
    expect(scaleAmount(a as number | null, from as number, to as number)).toBe(s);
  });
});
