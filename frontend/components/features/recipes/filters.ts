import type { SearchParams } from "@/lib/api";

export const TYPES = [
  { value: "main course", label: "Main course" },
  { value: "breakfast", label: "Breakfast" },
  { value: "soup", label: "Soup" },
  { value: "salad", label: "Salad" },
  { value: "side dish", label: "Side dish" },
  { value: "dessert", label: "Dessert" },
];

export const CUISINES = ["Italian", "Mexican", "Indian", "Chinese", "Thai", "Mediterranean", "American", "British", "French"].map(
  (c) => ({ value: c.toLowerCase(), label: c }),
);

export const DIETS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten free", label: "Gluten free" },
  { value: "ketogenic", label: "Ketogenic" },
  { value: "pescetarian", label: "Pescetarian" },
];

export function filtersFromParams(p: URLSearchParams): SearchParams {
  const out: SearchParams = {};
  for (const k of ["q", "type", "cuisine", "diet"] as const) {
    const v = p.get(k);
    if (v) out[k] = v;
  }
  if (p.get("matches_kitchen") === "1") out.matches_kitchen = true;
  return out;
}

export function filtersToQuery(f: SearchParams): string {
  const qs = new URLSearchParams();
  for (const k of ["q", "type", "cuisine", "diet"] as const) if (f[k]) qs.set(k, f[k]);
  if (f.matches_kitchen) qs.set("matches_kitchen", "1");
  const s = qs.toString();
  return s ? `?${s}` : "";
}
