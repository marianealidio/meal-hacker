import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/styleguide" }));
vi.mock("motion/react", async (orig) => ({ ...(await orig<typeof import("motion/react")>()), useReducedMotion: () => true }));

import Styleguide from "@/app/styleguide/page";
import NotFound from "@/app/not-found";

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("styleguide", () => {
  it("shows every colour token", () => {
    wrap(<Styleguide />);
    for (const hex of ["#FBF6EE", "#F3EBDD", "#FFFDF8", "#8FA98B", "#34503F", "#1F3328", "#DFE8DC", "#E8836B", "#A3472F", "#F7DDD5", "#F4C9C0", "#F2D08A", "#2A2A26", "#5C5C55", "#E6DCCB"]) {
      expect(screen.getAllByText(hex, { exact: false }).length).toBeGreaterThan(0);
    }
  });

  it("pairs the butter swatch with ink text, not butter-ink (4.3:1 fails AA)", () => {
    wrap(<Styleguide />);
    const label = screen.getByTestId("swatch-label-butter");
    expect(label.parentElement).toHaveClass("text-ink");
    expect(label).toHaveTextContent("on ink");
  });
});

describe("not found", () => {
  it("has a friendly heading and a way home", () => {
    wrap(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "This shelf is empty" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });
});
