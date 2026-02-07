import { test, expect } from "@playwright/test";

// Helper to create a test user and login
async function setupAuthenticatedUser(page: any) {
  // This would require a test database - for now we'll skip auth-required tests
  // In a real setup, you'd seed the database and login
}

test.describe("Groups Page (Unauthenticated)", () => {
  test("should redirect to signin when not authenticated", async ({ page }) => {
    await page.goto("/groups");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

test.describe("Bets Page (Unauthenticated)", () => {
  test("should redirect to signin when not authenticated", async ({ page }) => {
    await page.goto("/bets");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

test.describe("Parlays Page (Unauthenticated)", () => {
  test("should redirect to signin when not authenticated", async ({ page }) => {
    await page.goto("/parlays");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

test.describe("Landing Page", () => {
  test("should be accessible without authentication", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /bet with your/i })).toBeVisible();
  });
});
