import { describe, expect, it } from "vitest";
import { addDays, formatDay, formatLong, parseISODate, relativeExpiry, startOfWeek, toISODate } from "@/lib/dates";

describe("dates", () => {
  it("round-trips local dates without shifting the day", () => {
    const d = new Date(2026, 9, 26, 23, 30);
    expect(toISODate(d)).toBe("2026-10-26");
    expect(toISODate(parseISODate("2026-10-26"))).toBe("2026-10-26");
  });

  it("finds Monday across the BST change and month ends", () => {
    expect(toISODate(startOfWeek(parseISODate("2026-10-25")))).toBe("2026-10-19");
    expect(toISODate(startOfWeek(parseISODate("2026-11-01")))).toBe("2026-10-26");
    expect(toISODate(addDays(parseISODate("2026-10-26"), 7))).toBe("2026-11-02");
    expect(toISODate(addDays(parseISODate("2026-10-26"), -7))).toBe("2026-10-19");
  });

  it("formats en-GB", () => {
    expect(formatDay("2026-10-26")).toBe("Mon 26 Oct");
  });

  it.each([
    [null, "No date", "none"], [-2, "Expired 2 days ago", "expired"], [-1, "Expired 1 day ago", "expired"],
    [0, "Expires today", "today"], [1, "1 day left", "soon"], [3, "3 days left", "soon"], [9, "9 days left", "fine"],
  ])("relativeExpiry(%s)", (n, label, tone) => {
    expect(relativeExpiry(n as number | null)).toEqual({ label, tone });
  });

  it("returns an empty string for invalid dates", () => {
    expect(formatDay("nope")).toBe("");
    expect(formatLong("")).toBe("");
  });
});
