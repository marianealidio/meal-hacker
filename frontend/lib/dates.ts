const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Local `YYYY-MM-DD`. Never goes through UTC, so late evenings keep their day. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight for a `YYYY-MM-DD` string. */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Local Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7));
}

export function formatDay(s: string): string {
  const d = parseISODate(s);
  if (Number.isNaN(d.getTime())) return "";
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function formatLong(s: string): string {
  const d = parseISODate(s);
  if (Number.isNaN(d.getTime())) return "";
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

/** "26 Oct – 1 Nov 2026" for the week starting on `start`; both years when it spans New Year. */
export function formatWeekRange(start: string): string {
  const a = parseISODate(start);
  if (Number.isNaN(a.getTime())) return "";
  const b = addDays(a, 6);
  const part = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  const sameYear = a.getFullYear() === b.getFullYear();
  return `${part(a)}${sameYear ? "" : ` ${a.getFullYear()}`} \u2013 ${part(b)} ${b.getFullYear()}`;
}

export function isToday(s: string): boolean {
  return s === toISODate(new Date());
}

export type ExpiryTone = "today" | "soon" | "fine" | "expired" | "none";

export function relativeExpiry(daysLeft: number | null): { label: string; tone: ExpiryTone } {
  if (daysLeft === null) return { label: "No date", tone: "none" };
  if (daysLeft < 0) {
    const n = -daysLeft;
    return { label: `Expired ${n} ${n === 1 ? "day" : "days"} ago`, tone: "expired" };
  }
  if (daysLeft === 0) return { label: "Expires today", tone: "today" };
  if (daysLeft === 1) return { label: "1 day left", tone: "soon" };
  return { label: `${daysLeft} days left`, tone: daysLeft <= 3 ? "soon" : "fine" };
}
