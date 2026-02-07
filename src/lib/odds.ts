/**
 * Odds calculation utilities for American odds format
 */

/**
 * Calculate potential payout from American odds and stake
 * @param americanOdds - The American odds (e.g., +150, -220)
 * @param stake - The amount wagered
 * @returns Total payout (stake + winnings)
 */
export function calculatePayout(americanOdds: number, stake: number): number {
  if (americanOdds > 0) {
    // Positive odds: profit = stake * (odds / 100)
    const profit = stake * (americanOdds / 100);
    return stake + profit;
  } else {
    // Negative odds: profit = stake * (100 / |odds|)
    const profit = stake * (100 / Math.abs(americanOdds));
    return stake + profit;
  }
}

/**
 * Calculate just the profit from American odds and stake
 */
export function calculateProfit(americanOdds: number, stake: number): number {
  if (americanOdds > 0) {
    return stake * (americanOdds / 100);
  } else {
    return stake * (100 / Math.abs(americanOdds));
  }
}

/**
 * Convert American odds to decimal odds
 */
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

/**
 * Convert American odds to implied probability
 */
export function americanToImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

/**
 * Format American odds for display
 */
export function formatAmericanOdds(odds: number): string {
  if (odds > 0) {
    return `+${odds}`;
  }
  return odds.toString();
}

/**
 * Calculate combined parlay odds from multiple American odds
 */
export function calculateParlayOdds(oddsArray: number[]): number {
  // Convert all to decimal, multiply, then convert back to American
  const combinedDecimal = oddsArray.reduce((acc, odds) => {
    return acc * americanToDecimal(odds);
  }, 1);

  // Convert back to American
  if (combinedDecimal >= 2) {
    return Math.round((combinedDecimal - 1) * 100);
  } else {
    return Math.round(-100 / (combinedDecimal - 1));
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Parse odds input string to number
 * Handles formats like "+150", "-220", "150", etc.
 */
export function parseOddsInput(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '');
  const num = parseInt(cleaned, 10);

  if (isNaN(num)) return null;
  if (num === 0) return null;
  if (num > -100 && num < 100 && num !== 0) return null; // Invalid odds range

  return num;
}

/**
 * Validate American odds
 */
export function isValidAmericanOdds(odds: number): boolean {
  return odds !== 0 && (odds >= 100 || odds <= -100);
}
