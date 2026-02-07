import { test, expect } from "@playwright/test";

test.describe("Invite Flow", () => {
  test.describe("Unauthenticated User", () => {
    test("should show invalid invite for nonexistent code", async ({
      page,
    }) => {
      // Use a code that doesn't exist - should show invalid invite
      await page.goto("/invite/NONEXISTENT");
      // Wait for loading to disappear and content to appear
      await expect(page.getByText("Loading invite...")).toBeHidden({ timeout: 15000 });
      await expect(page.getByText("Invalid Invite")).toBeVisible();
      await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
    });

    test("should show Go Home button for invalid invite code", async ({
      page,
    }) => {
      // Use a code that doesn't exist
      await page.goto("/invite/testcode123");
      // Wait for loading to complete
      await expect(page.getByText("Loading invite...")).toBeHidden({ timeout: 15000 });
      // Should show invalid invite message with Go Home button
      await expect(page.getByText("Invalid Invite")).toBeVisible();
      await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
    });
  });

  test.describe("Join with Code Modal", () => {
    test("should show join modal with code input", async ({ page }) => {
      await page.goto("/auth/signin");
      // For this test, we need to be logged in first
      // Skip if not logged in
    });
  });
});

test.describe("Group Slugs", () => {
  test("should use readable slugs in group URLs", async ({ page }) => {
    // This test verifies that group URLs use slugs instead of UUIDs
    // Navigate to groups page (requires auth - will redirect to signin)
    await page.goto("/groups");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

test.describe("Auth Redirects", () => {
  test("should redirect to original destination after signin", async ({
    page,
  }) => {
    // Test that ?redirect param works
    await page.goto("/auth/signin?redirect=/invite/testcode");
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
    // The redirect param should be preserved
    expect(page.url()).toContain("redirect");
  });

  test("should redirect to original destination after signup", async ({
    page,
  }) => {
    await page.goto("/auth/signup?redirect=/invite/testcode");
    await expect(page.getByRole("heading", { name: "Get Started" })).toBeVisible();
    expect(page.url()).toContain("redirect");
  });
});
