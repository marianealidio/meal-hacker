import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("keeps toasts with an action longer than plain ones", () => {
    vi.useFakeTimers();
    function Fire() {
      const { toast } = useToast();
      return (
        <>
          <button onClick={() => toast({ title: "Plain" })}>plain</button>
          <button onClick={() => toast({ title: "Undoable", action: { label: "Undo", onClick: () => {} } })}>action</button>
        </>
      );
    }
    const { unmount } = render(<Toaster><Fire /></Toaster>);
    fireEvent.click(screen.getByText("plain"));
    fireEvent.click(screen.getByText("action"));
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.queryByText("Plain")).not.toBeInTheDocument();
    expect(screen.getByText("Undoable")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText("Undoable")).not.toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
