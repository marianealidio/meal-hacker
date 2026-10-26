import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MealCard } from "@/components/features/MealCard";
import { Toaster } from "@/components/ui/Toaster";
import type { RecipeSummary } from "@/lib/types";

const recipe: RecipeSummary = {
  id: 716429, title: "Pasta with garlic", image: "https://img.spoonacular.com/recipes/716429-556x370.jpg",
  description: "A bright weeknight pasta.", ready_in_minutes: 45, servings: 2, diets: ["dairy free"],
  used: ["garlic", "spinach"], missing: [{ name: "scallions", aisle: "Produce" }], is_favourite: false, uses_expiring: ["spinach"],
};
const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}><Toaster>{ui}</Toaster></QueryClientProvider>);

describe("MealCard", () => {
  it("shows description, time, have/missing and expiring chips, linking to the recipe", () => {
    wrap(<MealCard recipe={recipe} size="standard" />);
    expect(screen.getByRole("link", { name: /Pasta with garlic/ })).toHaveAttribute("href", "/recipes/716429");
    expect(screen.getByText("A bright weeknight pasta.")).toBeInTheDocument();
    expect(screen.getByText("45 min")).toBeInTheDocument();
    expect(screen.getByText("uses 2")).toBeInTheDocument();
    expect(screen.getByText("missing 1")).toBeInTheDocument();
    expect(screen.getByText("uses your spinach")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeInTheDocument();
  });

  it("hero has the Add to plan action and a labelled favourite toggle", async () => {
    const onAdd = vi.fn();
    wrap(<MealCard recipe={recipe} size="hero" onAddToPlan={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to plan" }));
    expect(onAdd).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save to favourites" })).toHaveAttribute("aria-pressed", "false");
  });

  it("compact hides the description", () => {
    wrap(<MealCard recipe={recipe} size="compact" />);
    expect(screen.queryByText("A bright weeknight pasta.")).not.toBeInTheDocument();
  });

  it("keeps a 44px hit area on the compact favourite button", () => {
    wrap(<MealCard recipe={recipe} size="compact" />);
    const btn = screen.getByRole("button", { name: "Save to favourites" });
    expect(btn.className).toContain("size-11");
    expect(btn.className).not.toContain("scale-");
  });
});
