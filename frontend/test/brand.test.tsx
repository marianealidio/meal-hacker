import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Logo } from "@/components/brand/Logo";
import { WaveDivider } from "@/components/brand/WaveDivider";
import { Doodle } from "@/components/brand/Doodle";

vi.mock("motion/react", async (orig) => {
  const mod = await orig<typeof import("motion/react")>();
  return { ...mod, useReducedMotion: () => true };
});

describe("brand", () => {
  it("logo is a labelled image", () => {
    render(<Logo withWordmark />);
    expect(screen.getByRole("img", { name: "Meal Hacker" })).toBeInTheDocument();
  });

  it.each([1, 2, 3, 4] as const)("wave %i is decorative", (v) => {
    const { container } = render(<WaveDivider variant={v} from="fill-cream" to="bg-sage" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("wave variants have distinct shapes", () => {
    const paths = ([1, 2, 3, 4] as const).map((v) => {
      const { container } = render(<WaveDivider variant={v} from="fill-cream" to="bg-sage" />);
      return container.querySelector("path")!.getAttribute("d");
    });
    expect(new Set(paths).size).toBe(4);
  });

  it("doodles are decorative", () => {
    const { container } = render(<Doodle name="sprig" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("Reveal renders children without motion when reduced motion is on", async () => {
    const { Reveal } = await import("@/components/brand/Reveal");
    render(<Reveal><p>hello</p></Reveal>);
    expect(screen.getByText("hello")).toBeVisible();
  });
});
