import { expect, test } from "@playwright/test";
import { resetDemoKitchen, openKitchen } from "./helpers";

test("demo kitchen: add food, plan a recipe, shop for it, log out", async ({ page, isMobile }) => {
  await openKitchen(page);
  await resetDemoKitchen(page);

  // Kitchen: quick add.
  await page.goto("/kitchen");
  await page.getByLabel("Add an ingredient").fill("2 lemons");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("heading", { name: "lemons", level: 3 })).toBeVisible();

  // Recipes: open the first recipe and plan it.
  await page.goto("/recipes");
  await page.locator('a[href^="/recipes/"]').first().click();
  await expect(page).toHaveURL(/\/recipes\/\d+/);
  await page.getByRole("button", { name: "Add to plan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByText(/^Added to /)).toBeVisible();

  // Planner: the meal sits on today's card.
  await page.goto("/planner");
  const today = page.locator("section").filter({ hasText: "Today" }).filter({ has: page.locator("li") }).first();
  await expect(today.locator("li").first()).toBeVisible();

  // Shopping: tick a planned item and find it in the basket.
  await page.goto("/shopping");
  const row = page.locator("li").filter({ hasText: "from your plan" }).first();
  await expect(row).toBeVisible();
  const checkbox = row.getByRole("checkbox");
  const name = (await checkbox.getAttribute("aria-label")) ?? "";
  // The row leaves its group as soon as it is ticked, so click rather than check().
  await checkbox.click({ force: true });
  const basket = page.getByRole("region", { name: "In the basket" });
  await expect(basket).toBeVisible();
  await expect(basket.getByRole("checkbox", { name })).toBeChecked();

  // Log out: sidebar on desktop, account menu on mobile.
  if (isMobile) {
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
  } else {
    await page.getByRole("button", { name: "Log out" }).click();
  }
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Open the kitchen" }).first()).toBeVisible();
});
