import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MealPill } from "@/components/features/planner/MealPill";
import { Toaster } from "@/components/ui/Toaster";
import type { MealPlan } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const meal: MealPlan = {
  id: 1, recipe_id: 716429, recipe_title: "Pasta with Garlic, Scallions, Cauliflower and Breadcrumbs",
  recipe_image: "", description: "", planned_date: "2026-10-26", slot: "dinner",
};

describe("MealPill", () => {
  // At 1280px the planner columns are ~125px wide; the title once collapsed to zero width beside the thumbnail and menu.
  it("moves the title onto its own row on wide screens so a narrow column cannot squeeze it out", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Toaster><ul><MealPill meal={meal} /></ul></Toaster>
      </QueryClientProvider>,
    );
    const link = screen.getByRole("link", { name: meal.recipe_title });
    expect(link).toHaveClass("lg:col-span-2", "lg:row-start-2");
    expect(link.closest("li")).toHaveClass("lg:grid");
    expect(screen.getByRole("button", { name: `Actions for ${meal.recipe_title}` })).toHaveClass("lg:col-start-2", "lg:row-start-1");
  });
});
