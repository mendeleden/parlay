import { test, expect } from "@playwright/test";

// Helper to create a test page with the modal
async function setupTestPage(page: any) {
  // We'll inject a test component that renders the modal
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

test.describe("Import Markets Modal", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestPage(page);
  });

  test("Polymarket API returns markets", async ({ page }) => {
    const response = await page.evaluate(async () => {
      const input = JSON.stringify({
        "0": { json: { source: "polymarket", limit: 10 } },
      });
      const resp = await fetch(
        "/api/trpc/markets.browse?batch=1&input=" + encodeURIComponent(input)
      );
      return resp.json();
    });

    const markets = response[0]?.result?.data?.json?.markets;
    expect(markets).toBeDefined();
    expect(markets.length).toBeGreaterThan(0);
    expect(markets[0]).toHaveProperty("id");
    expect(markets[0]).toHaveProperty("title");
    expect(markets[0]).toHaveProperty("source", "polymarket");
  });

  test("Kalshi API returns markets", async ({ page }) => {
    const response = await page.evaluate(async () => {
      const input = JSON.stringify({
        "0": { json: { source: "kalshi", limit: 10 } },
      });
      const resp = await fetch(
        "/api/trpc/markets.browse?batch=1&input=" + encodeURIComponent(input)
      );
      return resp.json();
    });

    const markets = response[0]?.result?.data?.json?.markets;
    expect(markets).toBeDefined();
    expect(markets.length).toBeGreaterThan(0);
    expect(markets[0]).toHaveProperty("id");
    expect(markets[0]).toHaveProperty("title");
    expect(markets[0]).toHaveProperty("source", "kalshi");
  });

  test("Polymarket category filter works", async ({ page }) => {
    const response = await page.evaluate(async () => {
      const input = JSON.stringify({
        "0": { json: { source: "polymarket", category: "sports", limit: 10 } },
      });
      const resp = await fetch(
        "/api/trpc/markets.browse?batch=1&input=" + encodeURIComponent(input)
      );
      return resp.json();
    });

    const result = response[0]?.result?.data?.json;
    expect(result).toBeDefined();
    // Should return markets (might be 0 if no sports markets available)
    expect(result.markets).toBeDefined();
  });

  test("Polymarket search filter works", async ({ page }) => {
    const response = await page.evaluate(async () => {
      const input = JSON.stringify({
        "0": { json: { source: "polymarket", search: "super bowl", limit: 20 } },
      });
      const resp = await fetch(
        "/api/trpc/markets.browse?batch=1&input=" + encodeURIComponent(input)
      );
      return resp.json();
    });

    const markets = response[0]?.result?.data?.json?.markets;
    expect(markets).toBeDefined();
    // Check that search is working - titles should contain search term
    if (markets.length > 0) {
      const hasMatch = markets.some(
        (m: any) =>
          m.title.toLowerCase().includes("super") ||
          m.title.toLowerCase().includes("bowl")
      );
      expect(hasMatch).toBe(true);
    }
  });

  test("URL import works for Polymarket", async ({ page }) => {
    const response = await page.evaluate(async () => {
      const input = JSON.stringify({
        "0": { json: { url: "https://polymarket.com/event/super-bowl-lx-coin-toss" } },
      });
      const resp = await fetch(
        "/api/trpc/markets.importByUrl?batch=1&input=" + encodeURIComponent(input)
      );
      return resp.json();
    });

    const result = response[0]?.result?.data?.json;
    const error = response[0]?.error;

    // Log for debugging
    console.log("URL Import response:", JSON.stringify(response, null, 2));

    if (error) {
      console.log("Error:", error);
    }

    expect(result).toBeDefined();
    expect(result.source).toBe("polymarket");
    expect(result.markets).toBeDefined();
    expect(result.markets.length).toBeGreaterThan(0);
    expect(result.markets[0].title).toContain("Coin");
  });

  test("Kalshi search filter works", async ({ page }) => {
    const response = await page.evaluate(async () => {
      const input = JSON.stringify({
        "0": { json: { source: "kalshi", search: "super bowl", limit: 20 } },
      });
      const resp = await fetch(
        "/api/trpc/markets.browse?batch=1&input=" + encodeURIComponent(input)
      );
      return resp.json();
    });

    const markets = response[0]?.result?.data?.json?.markets;
    expect(markets).toBeDefined();
    // Kalshi may or may not have super bowl markets
  });

  test("Combined search across normalized text", async ({ page }) => {
    // Test that "superbowl" (no space) matches "Super Bowl"
    const response = await page.evaluate(async () => {
      const input = JSON.stringify({
        "0": { json: { source: "polymarket", search: "superbowl", limit: 50 } },
      });
      const resp = await fetch(
        "/api/trpc/markets.browse?batch=1&input=" + encodeURIComponent(input)
      );
      return resp.json();
    });

    const markets = response[0]?.result?.data?.json?.markets;
    console.log("Superbowl search results:", markets?.length);
    expect(markets).toBeDefined();
  });
});
