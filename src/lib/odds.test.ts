import { describe, it, expect } from "vitest";
import {
  calculatePayout,
  calculateProfit,
  americanToDecimal,
  americanToImpliedProbability,
  formatAmericanOdds,
  calculateParlayOdds,
  formatCurrency,
  parseOddsInput,
  isValidAmericanOdds,
} from "./odds";

describe("Odds Utilities", () => {
  describe("calculatePayout", () => {
    it("calculates payout for positive odds correctly", () => {
      // +150 means bet $100 to win $150 (total payout $250)
      expect(calculatePayout(150, 100)).toBe(250);
      // +200 means bet $100 to win $200 (total payout $300)
      expect(calculatePayout(200, 100)).toBe(300);
      // +100 means bet $100 to win $100 (total payout $200)
      expect(calculatePayout(100, 100)).toBe(200);
    });

    it("calculates payout for negative odds correctly", () => {
      // -150 means bet $150 to win $100 (total payout $250)
      expect(calculatePayout(-150, 150)).toBe(250);
      // -200 means bet $200 to win $100 (total payout $300)
      expect(calculatePayout(-200, 200)).toBe(300);
      // -100 means bet $100 to win $100 (total payout $200)
      expect(calculatePayout(-100, 100)).toBe(200);
    });

    it("handles different stake amounts", () => {
      expect(calculatePayout(150, 50)).toBe(125); // 50 + 75 = 125
      expect(calculatePayout(-200, 100)).toBe(150); // 100 + 50 = 150
    });
  });

  describe("calculateProfit", () => {
    it("calculates profit for positive odds", () => {
      expect(calculateProfit(150, 100)).toBe(150);
      expect(calculateProfit(200, 50)).toBe(100);
    });

    it("calculates profit for negative odds", () => {
      expect(calculateProfit(-150, 150)).toBe(100);
      expect(calculateProfit(-200, 200)).toBe(100);
    });
  });

  describe("americanToDecimal", () => {
    it("converts positive American odds to decimal", () => {
      expect(americanToDecimal(100)).toBe(2);
      expect(americanToDecimal(150)).toBe(2.5);
      expect(americanToDecimal(200)).toBe(3);
    });

    it("converts negative American odds to decimal", () => {
      expect(americanToDecimal(-100)).toBe(2);
      expect(americanToDecimal(-200)).toBeCloseTo(1.5);
      expect(americanToDecimal(-150)).toBeCloseTo(1.667, 2);
    });
  });

  describe("americanToImpliedProbability", () => {
    it("calculates implied probability for positive odds", () => {
      expect(americanToImpliedProbability(100)).toBe(0.5); // 50%
      expect(americanToImpliedProbability(200)).toBeCloseTo(0.333, 2); // 33.3%
    });

    it("calculates implied probability for negative odds", () => {
      expect(americanToImpliedProbability(-100)).toBe(0.5); // 50%
      expect(americanToImpliedProbability(-200)).toBeCloseTo(0.667, 2); // 66.7%
    });
  });

  describe("formatAmericanOdds", () => {
    it("formats positive odds with + sign", () => {
      expect(formatAmericanOdds(150)).toBe("+150");
      expect(formatAmericanOdds(100)).toBe("+100");
    });

    it("formats negative odds without additional sign", () => {
      expect(formatAmericanOdds(-150)).toBe("-150");
      expect(formatAmericanOdds(-200)).toBe("-200");
    });
  });

  describe("calculateParlayOdds", () => {
    it("calculates combined odds for multiple positive bets", () => {
      // Two +100 bets should combine to approximately +300
      const result = calculateParlayOdds([100, 100]);
      expect(result).toBeGreaterThan(200);
    });

    it("calculates combined odds for mixed bets", () => {
      // +150 and -150
      const result = calculateParlayOdds([150, -150]);
      expect(result).toBeGreaterThan(100);
    });

    it("handles three-leg parlays", () => {
      const result = calculateParlayOdds([100, 100, 100]);
      expect(result).toBeGreaterThan(500);
    });
  });

  describe("formatCurrency", () => {
    it("formats currency correctly", () => {
      expect(formatCurrency(100)).toBe("$100.00");
      expect(formatCurrency(1234.56)).toBe("$1,234.56");
      expect(formatCurrency(0)).toBe("$0.00");
    });
  });

  describe("parseOddsInput", () => {
    it("parses positive odds", () => {
      expect(parseOddsInput("+150")).toBe(150);
      expect(parseOddsInput("150")).toBe(150);
      expect(parseOddsInput(" +200 ")).toBe(200);
    });

    it("parses negative odds", () => {
      expect(parseOddsInput("-150")).toBe(-150);
      expect(parseOddsInput("-200")).toBe(-200);
    });

    it("rejects invalid odds", () => {
      expect(parseOddsInput("0")).toBeNull();
      expect(parseOddsInput("50")).toBeNull(); // Between -100 and 100
      expect(parseOddsInput("-50")).toBeNull();
      expect(parseOddsInput("abc")).toBeNull();
    });
  });

  describe("isValidAmericanOdds", () => {
    it("validates correct odds", () => {
      expect(isValidAmericanOdds(100)).toBe(true);
      expect(isValidAmericanOdds(150)).toBe(true);
      expect(isValidAmericanOdds(-100)).toBe(true);
      expect(isValidAmericanOdds(-200)).toBe(true);
    });

    it("rejects invalid odds", () => {
      expect(isValidAmericanOdds(0)).toBe(false);
      expect(isValidAmericanOdds(50)).toBe(false);
      expect(isValidAmericanOdds(-50)).toBe(false);
      expect(isValidAmericanOdds(99)).toBe(false);
      expect(isValidAmericanOdds(-99)).toBe(false);
    });
  });
});
