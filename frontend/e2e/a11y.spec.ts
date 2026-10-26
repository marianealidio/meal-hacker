import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openKitchen } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa"];

async function expectNoViolations(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `axe violations on ${path}`).toEqual([]);
}

test("public pages have no axe violations", async ({ page }) => {
  for (const path of ["/", "/login", "/signup"]) await expectNoViolations(page, path);
});

test("app pages have no axe violations", async ({ page }) => {
  await openKitchen(page);
  for (const path of ["/dashboard", "/kitchen", "/recipes", "/recipes/716429", "/planner", "/shopping", "/profile"]) {
    await expectNoViolations(page, path);
  }
});
