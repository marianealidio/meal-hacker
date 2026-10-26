import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/Toaster";
import type { Me } from "@/lib/types";

const getSession = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("@/lib/session", () => ({ getSession: () => getSession() }));
let mockPath = "/planner?week=x";
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-pathname": mockPath }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/planner",
}));

import AuthLayout from "@/app/(auth)/layout";
import AppLayout from "@/app/(app)/layout";

const user: Me = { id: 1, username: "cook", display_name: "Cook", diet: "", intolerances: [], onboarded: true, is_demo: false };
const demo: Me = { ...user, username: "demo", is_demo: true };
const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Toaster>{ui}</Toaster>
    </QueryClientProvider>,
  );

beforeEach(() => {
  getSession.mockReset();
  redirect.mockClear();
  mockPath = "/planner?week=x";
});

describe("(app) layout", () => {
  it("redirects a signed-out visitor to login with the full path as next", async () => {
    getSession.mockResolvedValue(null);
    await expect(AppLayout({ children: <p>secret</p> })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login?next=%2Fplanner%3Fweek%3Dx");
  });

  it("renders the shell around children for a signed-in user", async () => {
    getSession.mockResolvedValue(user);
    wrap(await AppLayout({ children: <p>planner content</p> }));
    expect(screen.getByText("planner content")).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("(auth) layout", () => {
  it("sends a signed-in regular user to the dashboard", async () => {
    getSession.mockResolvedValue(user);
    await expect(AuthLayout({ children: <p>form</p> })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("lets a demo user view the auth pages", async () => {
    getSession.mockResolvedValue(demo);
    wrap(await AuthLayout({ children: <p>login form</p> }));
    expect(screen.getByText("login form")).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("renders for a signed-out visitor", async () => {
    getSession.mockResolvedValue(null);
    wrap(await AuthLayout({ children: <p>login form</p> }));
    expect(screen.getByText("login form")).toBeInTheDocument();
  });
});

describe("(app) layout onboarding", () => {
  it("redirects a non-onboarded user to onboarding", async () => {
    getSession.mockResolvedValue({ ...user, onboarded: false });
    await expect(AppLayout({ children: <p>x</p> })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it.each(["/onboarding", "/profile"])("does not redirect a non-onboarded user on %s", async (path) => {
    getSession.mockResolvedValue({ ...user, onboarded: false });
    mockPath = path;
    wrap(await AppLayout({ children: <p>page</p> }));
    expect(redirect).not.toHaveBeenCalled();
  });
});
