export function greeting(date: Date, name: string): string {
  const h = date.getHours();
  const part = h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : "evening";
  return `Good ${part}, ${name.trim() || "chef"}`;
}
