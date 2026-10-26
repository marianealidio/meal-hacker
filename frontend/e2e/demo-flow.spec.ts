import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, resetDemoKitchen, openKitchen } from "./helpers";

test("demo kitchen: add food, plan a recipe, shop for it, log out", async ({ page, isMobile }) => {
  await openKitchen(page);
  await resetDemoKitchen(page);

  // Dashboard: wait for the pick and the suggestions row, the widest content on the page.
  await expect(page.getByText("More ideas")).toBeVisible();
  await expectNoHorizontalScroll(page, "dashboard");

  // Kitchen: quick add.
  await page.goto("/kitchen");
  await page.getByLabel("Add an ingredient").fill("2 lemons");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("heading", { name: "lemons", level: 3 })).toBeVisible();
  await expectNoHorizontalScroll(page, "kitchen");

  // Recipes: open the first recipe and plan it.
  await page.goto("/recipes");
  await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();
  await expectNoHorizontalScroll(page, "recipes");
  await page.locator('a[href^="/recipes/"]').first().click();
  await expect(page).toHaveURL(/\/recipes\/\d+/);
  const title = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  expect(title).not.toBe("");
  await expectNoHorizontalScroll(page, "recipe detail");
  await page.getByRole("button", { name: "Add to plan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByText(/^Added to /).first()).toBeVisible();

  // Planner: the meal sits on today's card.
  await page.goto("/planner");
  const today = page.getByRole("region").filter({ has: page.getByText("Today", { exact: true }) });
  await expect(today).toHaveCount(1);
  await expect(today.getByRole("link", { name: title })).toBeVisible();
  await expectNoHorizontalScroll(page, "planner");

  // Shopping: tick a planned item and find it in the basket.
  await page.goto("/shopping");
  const row = page.locator("li").filter({ hasText: "from your plan" }).first();
  await expect(row).toBeVisible();
  await expectNoHorizontalScroll(page, "shopping");
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
