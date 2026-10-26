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

  it.each(["/%09/evil.example", "/\\evil.example", "https://evil.example"])("rejects the unsafe next %s", async (n) => {
    search = new URLSearchParams(`next=${n}`);
    if (n.startsWith("/%09")) search = new URLSearchParams([["next", "/\t/evil.example"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ id: 1, username: "ann" }));
    wrap(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("keeps a local path with a query", async () => {
    search = new URLSearchParams([["next", "/planner?week=2026-10-26"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ id: 1, username: "ann" }));
    wrap(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/planner?week=2026-10-26"));
  });

  it("shows errors that belong to no rendered field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: { code: "invalid", message: "Some fields need fixing.", fields: { non_field_errors: ["Account is locked."] } } }, 400));
    wrap(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Account is locked.");
    await waitFor(() => expect(alert).toHaveFocus());
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

  it("shows every message for a field and focuses the first invalid field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: { code: "invalid", message: "Some fields need fixing.", fields: { password: ["Too short.", "Too common."] } } }, 400));
    wrap(<SignupForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Too short. Too common.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Password")).toHaveFocus());
  });

  it("shows errors that belong to no rendered field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: { code: "invalid", message: "Some fields need fixing.", fields: { non_field_errors: ["Signups are paused."] } } }, 400));
    wrap(<SignupForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "Str0ngPass!23");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Signups are paused.");
  });

  it("signs up and goes to the dashboard", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ id: 2, username: "newbie" }, 201));
    wrap(<SignupForm />);
    await userEvent.type(screen.getByLabelText("Username"), "newbie");
    await userEvent.type(screen.getByLabelText("Password"), "Str0ngPass!23");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    const body = String((f.mock.calls.at(-1)![1] as RequestInit).body);
    expect(body).toContain("newbie");
    expect(body).toContain("Str0ngPass!23");
  });
});
