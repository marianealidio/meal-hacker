import { describe, expect, it } from "vitest";
import { greeting } from "@/lib/greeting";

describe("greeting", () => {
  it.each([
    [7, "Good morning, Ann"], [11, "Good morning, Ann"], [12, "Good afternoon, Ann"],
    [17, "Good afternoon, Ann"], [18, "Good evening, Ann"], [2, "Good evening, Ann"],
  ])("%i:00 → %s", (h, expected) => {
    expect(greeting(new Date(2026, 9, 26, h, 0), "Ann")).toBe(expected);
  });

  it("falls back to chef", () => {
    expect(greeting(new Date(2026, 9, 26, 9), "  ")).toBe("Good morning, chef");
  });
});
