import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useSearchParams: () => search, usePathname: () => "/login" }));

import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

beforeEach(() => { push.mockReset(); search = new URLSearchParams(); document.cookie = "csrftoken=t; path=/"; });

describe("LoginForm", () => {
  it("logs in and goes to next when it is a local path", async () => {
    search = new URLSearchParams("next=/planner");
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ id: 1, username: "ann" }));
    wrap(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/planner"));
    expect(f.mock.calls.at(-1)![0]).toBe("/api/auth/login/");
  });

  it("ignores an external next", async () => {
    search = new URLSearchParams("next=//evil.example");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ id: 1, username: "ann" }));
    wrap(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows wrong-password errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: { code: "invalid_credentials", message: "That username and password don't match.", fields: {} } }, 400));
    wrap(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "bad");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That username and password don't match.");
  });

  it("offers the demo kitchen", () => {
    wrap(<LoginForm />);
    expect(screen.getByRole("button", { name: "Open the kitchen" })).toBeInTheDocument();
  });
});

describe("SignupForm", () => {
  it("maps field errors to fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: { code: "invalid", message: "Some fields need fixing.", fields: { username: ["That username is taken. Try another."] } } }, 400));
    wrap(<SignupForm />);
    await userEvent.type(screen.getByLabelText("Username"), "taken");
    await userEvent.type(screen.getByLabelText("Password"), "Str0ngPass!23");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("That username is taken. Try another.")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
  });
});
