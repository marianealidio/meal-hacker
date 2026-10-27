import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));
vi.mock("motion/react", async (orig) => ({ ...(await orig<typeof import("motion/react")>()), useReducedMotion: () => true }));

import LandingPage from "@/app/(marketing)/page";

function renderPage() {
  return render(<QueryClientProvider client={new QueryClient()}><LandingPage /></QueryClientProvider>);
}

describe("landing page", () => {
  it("has exactly one h1 with the headline", () => {
    renderPage();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Cook what you have.");
    expect(h1s[0]).toHaveTextContent("Waste nothing.");
  });

  it("has the main sections with anchors", () => {
    const { container } = renderPage();
    for (const id of ["how-it-works", "features", "about"]) expect(container.querySelector(`#${id}`)).not.toBeNull();
    for (const name of ["How it works", "Everything your kitchen needs", "Built as a final-year project", "Your kitchen is already full of dinners."]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
  });

  it("cites the food waste source", () => {
    renderPage();
    expect(screen.getByText(/4.5 million tonnes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /WRAP/ })).toHaveAttribute("href", "https://www.wrap.ngo");
  });

  it("offers Open the kitchen and never Try the demo", () => {
    const { container } = renderPage();
    expect(screen.getAllByRole("button", { name: /Open the kitchen/ }).length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).not.toMatch(/try the demo/i);
  });

  it("has five feature rows", () => {
    renderPage();
    const features = screen.getByRole("heading", { name: "Everything your kitchen needs" }).closest("section")!;
    expect(within(features).getAllByRole("heading", { level: 3 })).toHaveLength(5);
  });

  it("every image has alt text", () => {
    const { container } = renderPage();
    container.querySelectorAll("img").forEach((img) => expect(img.getAttribute("alt")).toBeTruthy());
  });

  it("shows the headline, sub copy and buttons at first paint (no entrance animation)", () => {
    const { container } = renderPage();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.innerHTML).not.toMatch(/animate-/);
    const textColumn = h1.parentElement!;
    expect(textColumn.querySelectorAll("p, button, a").length).toBeGreaterThan(3);
    expect(textColumn.querySelector("[class*='animate-']:not([aria-hidden])")).toBeNull();
    expect(container.querySelector("#hero-title")).toBe(h1);
  });

  it("separates the two headline lines with a space and labels the stack list", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Cook what you have. Waste nothing.");
    expect(screen.getByRole("list", { name: "Built with" })).toBeInTheDocument();
  });
});
