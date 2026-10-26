import { expect, type Page } from "@playwright/test";

/** Signs into the shared demo kitchen through the landing page button. */
export async function openKitchen(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open the kitchen" }).first().click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
}

/**
 * The demo kitchen is shared by every test in a run, so remove anything an earlier project left behind
 * (planned meals, shopping rows and lemons) to keep the flow deterministic.
 */
export async function resetDemoKitchen(page: Page) {
  await page.evaluate(async () => {
    const csrf = decodeURIComponent(document.cookie.split("; ").find((c) => c.startsWith("csrftoken="))?.split("=")[1] ?? "");
    const call = (method: string, url: string) =>
      fetch(url, { method, credentials: "same-origin", headers: { "X-CSRFToken": csrf } });
    const week = await (await fetch("/api/plans/", { credentials: "same-origin" })).json();
    for (const day of week.days) for (const meal of day.meals) await call("DELETE", `/api/plans/${meal.id}/`);
    const shopping = await (await fetch("/api/shopping/", { credentials: "same-origin" })).json();
    for (const item of shopping) await call("DELETE", `/api/shopping/${item.id}/`);
    const inventory = await (await fetch("/api/inventory/", { credentials: "same-origin" })).json();
    for (const item of inventory) if (/lemon/i.test(item.name)) await call("DELETE", `/api/inventory/${item.id}/`);
  });
}
