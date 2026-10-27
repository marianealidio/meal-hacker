import { describe, expect, it } from "vitest";
import { recipeImage } from "@/lib/images";

describe("recipeImage", () => {
  it("requests the largest Spoonacular size", () => {
    expect(recipeImage("https://img.spoonacular.com/recipes/716429-556x370.jpg")).toBe(
      "https://img.spoonacular.com/recipes/716429-636x393.jpg",
    );
  });

  it("accepts an explicit size", () => {
    expect(recipeImage("https://img.spoonacular.com/recipes/1-312x231.png", "480x360")).toBe(
      "https://img.spoonacular.com/recipes/1-480x360.png",
    );
  });

  it("leaves other URLs and empty values alone", () => {
    expect(recipeImage("https://images.unsplash.com/photo-1?w=800")).toBe("https://images.unsplash.com/photo-1?w=800");
    expect(recipeImage("")).toBe("");
  });
});
