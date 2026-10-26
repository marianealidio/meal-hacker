import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/" }));

import { OpenKitchenButton } from "@/components/marketing/OpenKitchenButton";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

function wrap(ui: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

describe("OpenKitchenButton", () => {
  it("says Open the kitchen", () => {
    wrap(<OpenKitchenButton arrow />);
    expect(screen.getByRole("button", { name: "Open the kitchen →" })).toBeInTheDocument();
  });

  it("logs into the demo once and goes to the dashboard", async () => {
    document.cookie = "csrftoken=t; path=/";
    let resolve!: (r: Response) => void;
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((r) => { resolve = r; }));
    wrap(<OpenKitchenButton />);
    const btn = screen.getByRole("button", { name: "Open the kitchen" });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe("/api/auth/demo/");
    resolve(new Response(JSON.stringify({ id: 1, username: "demo", is_demo: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("still goes to the dashboard if it unmounts before the response", async () => {
    push.mockClear();
    document.cookie = "csrftoken=t; path=/";
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((r) => { resolve = r; }));
    const { unmount } = wrap(<OpenKitchenButton />);
    await userEvent.click(screen.getByRole("button", { name: "Open the kitchen" }));
    unmount();
    resolve(new Response(JSON.stringify({ id: 1, username: "demo", is_demo: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows the error when the backend is asleep", async () => {
    document.cookie = "csrftoken=t; path=/";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html/>", { status: 502, headers: { "Content-Type": "text/html" } }));
    wrap(<OpenKitchenButton />);
    await userEvent.click(screen.getByRole("button", { name: "Open the kitchen" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/waking up/);
  });
});

describe("SiteHeader", () => {
  it("has nav links, log in and the kitchen button", () => {
    wrap(<SiteHeader />);
    expect(screen.getAllByRole("link", { name: "How it works" })[0]).toHaveAttribute("href", "/#how-it-works");
    expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("button", { name: "Open the kitchen" }).length).toBeGreaterThan(0);
  });

  it("mobile menu button toggles aria-expanded", async () => {
    wrap(<SiteHeader />);
    const menu = screen.getByRole("button", { name: "Open menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
  });
});

describe("SiteFooter", () => {
  it("credits the author, Unsplash and Spoonacular", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/Mariane Alidio/)).toBeInTheDocument();
    expect(screen.getByText(/Unsplash/)).toBeInTheDocument();
    expect(screen.getByText(/Spoonacular/)).toBeInTheDocument();
  });

  it("groups its links in a footer nav that works from any route", () => {
    render(<SiteFooter />);
    const nav = screen.getByRole("navigation", { name: "Footer" });
    expect(within(nav).getByRole("link", { name: "About" })).toHaveAttribute("href", "/#about");
    expect(within(nav).getByRole("link", { name: "Features" })).toHaveAttribute("href", "/#features");
  });

  it("never says Try the demo", () => {
    const { container } = render(<SiteFooter />);
    expect(container.textContent).not.toMatch(/try the demo/i);
  });
});
