import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/Toaster";
import type { Me } from "@/lib/types";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace, refresh }), usePathname: () => "/dashboard" }));
const logout = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: { logout: () => logout() } }));

import { AppHeader } from "@/components/shell/AppHeader";

const me: Me = { id: 1, username: "cook", display_name: "Cook", diet: "", intolerances: [], onboarded: true, is_demo: false };
const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Toaster>{ui}</Toaster>
    </QueryClientProvider>,
  );

beforeEach(() => {
  replace.mockClear();
  refresh.mockClear();
  logout.mockReset();
});

describe("AppHeader greeting", () => {
  it("wraps a long greeting instead of truncating it", () => {
    wrap(<AppHeader me={{ ...me, display_name: "Guest chef" }} />);
    const greeting = screen.getByText(/^Good (morning|afternoon|evening), Guest chef/);
    expect(greeting).not.toHaveClass("truncate");
    expect(greeting).toHaveClass("break-words");
  });
});

describe("AppHeader account menu", () => {
  it("offers Profile and Log out, and logging out replaces to / then refreshes", async () => {
    logout.mockResolvedValue(undefined);
    wrap(<AppHeader me={me} />);
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute("href", "/profile");
    await userEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(refresh).toHaveBeenCalled();
  });

  it("clears stored assistant threads on logout", async () => {
    logout.mockResolvedValue(undefined);
    sessionStorage.setItem("mh-assistant-thread:1", "[]");
    sessionStorage.setItem("mh-assistant-thread:2", "[]");
    sessionStorage.setItem("other", "keep");
    wrap(<AppHeader me={me} />);
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(sessionStorage.getItem("mh-assistant-thread:1")).toBeNull();
    expect(sessionStorage.getItem("mh-assistant-thread:2")).toBeNull();
    expect(sessionStorage.getItem("other")).toBe("keep");
  });

  it("shows a toast when logout fails", async () => {
    logout.mockRejectedValue(new Error("boom"));
    wrap(<AppHeader me={me} />);
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(await screen.findByText("Couldn't log out. Try again.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
