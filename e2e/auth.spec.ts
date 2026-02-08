import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Authentication", () => {
  test("should redirect unauthenticated users to sign-in", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/groups");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("should show Clerk sign-in form", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-in");
    await expect(page.getByText("Sign in")).toBeVisible({ timeout: 10000 });
  });

  test("should show Clerk sign-up form", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-up");
    await expect(page.getByText("Sign up")).toBeVisible({ timeout: 10000 });
  });

  test("should show sign-in and get started buttons on landing page", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Get Started Free" })).toBeVisible();
    await expect(page.getByRole("button", { name: "I have an account" })).toBeVisible();
  });
});
