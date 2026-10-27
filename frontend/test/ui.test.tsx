import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/Field";
import { DialogContent, Dialog, DialogTrigger } from "@/components/ui/Dialog";

describe("Button", () => {
  it("primary uses coral with ink text", () => {
    render(<Button>Go</Button>);
    const b = screen.getByRole("button", { name: "Go" });
    expect(b.className).toContain("bg-coral");
    expect(b.className).toContain("text-ink");
  });

  it("pending is busy, disabled and ignores clicks", async () => {
    const onClick = vi.fn();
    render(<Button pending onClick={onClick}>Save</Button>);
    const b = screen.getByRole("button", { name: /save/i });
    expect(b).toHaveAttribute("aria-busy", "true");
    expect(b).toBeDisabled();
    await userEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Chip", () => {
  it("missing tone uses coral tint", () => {
    render(<Chip tone="missing">missing 2</Chip>);
    expect(screen.getByText("missing 2").closest("span")!.className).toContain("bg-coral-tint");
  });
});

describe("TextField", () => {
  it("links label and error accessibly", () => {
    render(<TextField label="Username" name="username" error="That username is taken." />);
    const input = screen.getByLabelText("Username");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "username-error");
    expect(screen.getByText("That username is taken.")).toHaveAttribute("id", "username-error");
  });
});

describe("Dialog", () => {
  it("opens with a title and a labelled close button", async () => {
    render(
      <Dialog>
        <DialogTrigger asChild><button>Open</button></DialogTrigger>
        <DialogContent title="Add to plan">body</DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByRole("dialog", { name: "Add to plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
