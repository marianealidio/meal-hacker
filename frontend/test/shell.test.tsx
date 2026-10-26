import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let pathname = "/recipes/716429";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => pathname }));

import { AppShell } from "@/components/shell/AppShell";
import type { Me } from "@/lib/types";

const me: Me = { id: 1, username: "demo", display_name: "Guest chef", diet: "", intolerances: [], onboarded: true, is_demo: true };
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("AppShell", () => {
  it("marks the matching section as current", () => {
    wrap(<AppShell me={me}><p>content</p></AppShell>);
    const current = screen.getAllByRole("link", { current: "page" });
    expect(current.length).toBeGreaterThan(0);
    current.forEach((l) => expect(l).toHaveTextContent("Recipes"));
  });

  it("greets the user by display name and flags the demo", () => {
    wrap(<AppShell me={me}><p>content</p></AppShell>);
    expect(screen.getByText(/, Guest chef$/)).toBeInTheDocument();
    expect(screen.getByText(/Demo kitchen/)).toBeInTheDocument();
  });

  it("has a skip link and the assistant button", () => {
    wrap(<AppShell me={me}><p>content</p></AppShell>);
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("button", { name: "Open kitchen assistant" })).toBeInTheDocument();
  });

  it("lists every section", () => {
    pathname = "/dashboard";
    wrap(<AppShell me={me}><p>content</p></AppShell>);
    for (const label of ["Dashboard", "Kitchen", "Recipes", "Favourites", "Planner", "Shopping"]) {
      expect(screen.getAllByRole("link", { name: new RegExp(label) }).length).toBeGreaterThan(0);
    }
  });
});
