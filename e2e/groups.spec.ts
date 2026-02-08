import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Groups Page (Unauthenticated)", () => {
  test("should redirect to sign-in when not authenticated", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/groups");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe("Bets Page (Unauthenticated)", () => {
  test("should redirect to sign-in when not authenticated", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/bets");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe("Parlays Page (Unauthenticated)", () => {
  test("should redirect to sign-in when not authenticated", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/parlays");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe("Landing Page", () => {
  test("should be accessible without authentication", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /bet with your/i })).toBeVisible();
  });
});
