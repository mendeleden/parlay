/**
 * Kalshi API client for fetching prediction market data
 * API Documentation: https://docs.kalshi.com/
 */

import { probabilityToAmericanOdds, formatVolume } from "./odds";

const KALSHI_BASE_URL = "https://api.elections.kalshi.com/trade-api/v2";

/**
 * Raw Kalshi market response from API
 */
export interface KalshiMarketRaw {
  ticker: string;
  event_ticker: string;
  market_type: string;
  title: string;
  subtitle: string;
  yes_sub_title: string;
  no_sub_title: string;
  open_time: string;
  close_time: string;
  expected_expiration_time: string;
  expiration_time: string;
  status: string;
  response_price_units: string;
  notional_value: number;
  tick_size: number;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  previous_yes_bid: number;
  previous_yes_ask: number;
  previous_price: number;
  volume: number;
  volume_24h: number;
  liquidity: number;
  open_interest: number;
  result: string;
  can_close_early: boolean;
  expiration_value: string;
  category: string;
  risk_limit_cents: number;
  strike_type: string;
  floor_strike: number;
  cap_strike: number;
  rules_primary: string;
  rules_secondary: string;
}

/**
 * Kalshi event (group of related markets)
 */
export interface KalshiEventRaw {
  event_ticker: string;
  series_ticker: string;
  sub_title: string;
  title: string;
  mutually_exclusive: boolean;
  category: string;
  markets: KalshiMarketRaw[];
}

/**
 * Transformed market data (matches ExternalMarket interface)
 */
export interface ExternalMarket {
  id: string;
  source: "polymarket" | "kalshi";
  title: string;
  description: string;
  options: Array<{
    name: string;
    probability: number;
    americanOdds: number;
  }>;
  volume: string;
  volumeRaw: number;
  endDate: string;
  imageUrl: string;
  tags: string[];
  sourceUrl: string;
  active: boolean;
}

/**
 * Browse options for fetching markets
 */
export interface BrowseMarketsOptions {
  category?: string;
  search?: string;
  limit?: number;
  seriesTicker?: string;
  status?: "open" | "closed" | "settled";
}

/**
 * Map category names to Kalshi categories
 */
const CATEGORY_MAP: Record<string, string> = {
  sports: "Sports",
  politics: "Politics",
  crypto: "Crypto",
  entertainment: "Culture",
  "pop-culture": "Culture",
  business: "Economics",
};

/**
 * Transform Kalshi market to our format
 */
function transformMarket(raw: KalshiMarketRaw): ExternalMarket {
  // Calculate probability from yes_bid/yes_ask (cents out of 100)
  const yesPrice = raw.yes_bid > 0 ? raw.yes_bid : raw.last_price;
  const probability = yesPrice / 100;
  const noProb = 1 - probability;

  const options = [
    {
      name: raw.yes_sub_title || "Yes",
      probability,
      americanOdds: probabilityToAmericanOdds(probability),
    },
    {
      name: raw.no_sub_title || "No",
      probability: noProb,
      americanOdds: probabilityToAmericanOdds(noProb),
    },
  ];

  return {
    id: raw.ticker,
    source: "kalshi",
    title: raw.title,
    description: raw.rules_primary || raw.subtitle || "",
    options,
    volume: formatVolume(raw.volume * (raw.notional_value / 100)), // Convert to dollars
    volumeRaw: raw.volume * (raw.notional_value / 100),
    endDate: raw.expiration_time || raw.close_time,
    imageUrl: "", // Kalshi doesn't provide images in API
    tags: raw.category ? [raw.category.toLowerCase()] : [],
    sourceUrl: `https://kalshi.com/markets/${raw.event_ticker}/${raw.ticker}`,
    active: raw.status === "active" || raw.status === "open",
  };
}

/**
 * Fetch markets from Kalshi API
 */
export async function fetchKalshiMarkets(
  options: BrowseMarketsOptions = {}
): Promise<ExternalMarket[]> {
  const { category, search, limit = 20, seriesTicker, status = "open" } = options;

  const params = new URLSearchParams();
  params.set("limit", String(Math.min(limit, 200)));
  params.set("status", status);

  // Add series ticker filter if provided
  if (seriesTicker) {
    params.set("series_ticker", seriesTicker);
  }

  const url = `${KALSHI_BASE_URL}/markets?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Kalshi API error: ${response.status}`);
    }

    const data = await response.json();
    const rawMarkets: KalshiMarketRaw[] = data.markets || [];

    let markets = rawMarkets
      .map(transformMarket)
      .filter((m) => m.active);

    // Client-side category filter
    if (category && CATEGORY_MAP[category]) {
      const kalshiCategory = CATEGORY_MAP[category].toLowerCase();
      markets = markets.filter((m) =>
        m.tags.some((t) => t.toLowerCase() === kalshiCategory)
      );
    }

    // Client-side search filter
    if (search) {
      const normalize = (str: string) =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "");

      const searchLower = search.toLowerCase();
      const searchNormalized = normalize(search);

      markets = markets.filter((m) => {
        const titleLower = m.title.toLowerCase();
        const titleNormalized = normalize(m.title);
        const descLower = m.description.toLowerCase();
        const descNormalized = normalize(m.description);

        return (
          titleLower.includes(searchLower) ||
          titleNormalized.includes(searchNormalized) ||
          descLower.includes(searchLower) ||
          descNormalized.includes(searchNormalized) ||
          m.tags.some((t) => t.toLowerCase().includes(searchLower))
        );
      });
    }

    return markets.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch Kalshi markets:", error);
    throw error;
  }
}

/**
 * Fetch a single market by ticker
 */
export async function fetchKalshiMarket(
  ticker: string
): Promise<ExternalMarket | null> {
  const url = `${KALSHI_BASE_URL}/markets/${ticker}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Kalshi API error: ${response.status}`);
    }

    const data = await response.json();
    const rawMarket: KalshiMarketRaw = data.market;
    return transformMarket(rawMarket);
  } catch (error) {
    console.error(`Failed to fetch Kalshi market ${ticker}:`, error);
    throw error;
  }
}

/**
 * Kalshi category definitions for UI
 */
export const KALSHI_CATEGORIES = [
  { id: "sports", label: "Sports", icon: "Trophy" },
  { id: "politics", label: "Politics", icon: "Landmark" },
  { id: "crypto", label: "Crypto", icon: "Bitcoin" },
  { id: "entertainment", label: "Culture", icon: "Film" },
  { id: "business", label: "Economics", icon: "TrendingUp" },
] as const;

/**
 * Fetch popular sports series from Kalshi
 */
export async function fetchKalshiSportsSeries(): Promise<string[]> {
  // Popular sports series tickers on Kalshi
  return [
    "KXSUPERBOWL",
    "KXNFL",
    "KXNBA",
    "KXMLB",
    "KXNHL",
    "KXMMA",
  ];
}
