import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Toaster, useToast } from "@/components/ui/Toaster";

function Trigger({ onUndo }: { onUndo: () => void }) {
  const { toast } = useToast();
  return (
    <button onClick={() => toast({ title: "Added to plan", description: "Tuesday dinner", action: { label: "Undo", onClick: onUndo } })}>
      fire
    </button>
  );
}

describe("Toaster", () => {
  it("shows a toast with its action", async () => {
    const onUndo = vi.fn();
    render(
      <Toaster>
        <Trigger onUndo={onUndo} />
      </Toaster>,
    );
    await userEvent.click(screen.getByText("fire"));
    expect(screen.getByText("Added to plan")).toBeInTheDocument();
    expect(screen.getByText("Tuesday dinner")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("useToast outside the provider fails loudly", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger onUndo={() => {}} />)).toThrow(/inside <Toaster>/);
  });
});
