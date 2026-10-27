export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "Home" },
  { href: "/kitchen", label: "Kitchen", icon: "Refrigerator" },
  { href: "/recipes", label: "Recipes", icon: "BookOpen" },
  { href: "/favourites", label: "Favourites", icon: "Heart" },
  { href: "/planner", label: "Planner", icon: "CalendarDays" },
  { href: "/shopping", label: "Shopping", icon: "ShoppingBasket" },
] as const;

export type NavItem = (typeof NAV)[number];

/** `/recipes/123` counts as inside `/recipes`. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}
