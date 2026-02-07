import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should redirect unauthenticated users to signin", async ({ page }) => {
    await page.goto("/groups");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("should show signin form", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
    await expect(page.getByLabel("Email or Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("should show signup form", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(
      page.getByRole("heading", { name: "Get Started" })
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("should navigate between signin and signup", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/auth\/signup/);

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByLabel("Email or Username").fill("invalid@test.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for the toast error message
    await expect(page.getByText(/invalid email/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
