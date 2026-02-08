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

/**
 * Convert probability (0-1) to American odds
 * Used for importing from prediction markets like Polymarket
 *
 * @param probability - Probability between 0 and 1
 * @returns American odds (positive for underdog, negative for favorite)
 *
 * @example
 * probabilityToAmericanOdds(0.65) // -186 (favorite)
 * probabilityToAmericanOdds(0.35) // +186 (underdog)
 * probabilityToAmericanOdds(0.50) // -100 (even)
 */
export function probabilityToAmericanOdds(probability: number): number {
  // Clamp probability to valid range
  const prob = Math.max(0.01, Math.min(0.99, probability));

  if (prob >= 0.5) {
    // Favorite: negative odds
    // Formula: -100 * p / (1 - p)
    return Math.round(-100 * prob / (1 - prob));
  } else {
    // Underdog: positive odds
    // Formula: 100 * (1 - p) / p
    return Math.round(100 * (1 - prob) / prob);
  }
}

/**
 * Format volume for display (e.g., "$2.4M", "$850K")
 */
export function formatVolume(volume: string | number): string {
  const num = typeof volume === 'string' ? parseFloat(volume) : volume;

  if (isNaN(num)) return '$0';

  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(0)}K`;
  } else {
    return `$${num.toFixed(0)}`;
  }
}
