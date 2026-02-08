import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Invite Flow", () => {
  test.describe("Unauthenticated User", () => {
    test("should show invalid invite for nonexistent code", async ({ page }) => {
      await setupClerkTestingToken({ page });
      await page.goto("/invite/NONEXISTENT");
      await expect(page.getByText("Loading invite...")).toBeHidden({ timeout: 15000 });
      await expect(page.getByText("Invalid Invite")).toBeVisible();
      await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
    });

    test("should show Go Home button for invalid invite code", async ({ page }) => {
      await setupClerkTestingToken({ page });
      await page.goto("/invite/testcode123");
      await expect(page.getByText("Loading invite...")).toBeHidden({ timeout: 15000 });
      await expect(page.getByText("Invalid Invite")).toBeVisible();
      await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
    });
  });
});
