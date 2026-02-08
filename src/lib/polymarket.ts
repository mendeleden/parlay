/**
 * Polymarket API client for fetching prediction market data
 * API Documentation: https://gamma-api.polymarket.com
 */

import { probabilityToAmericanOdds, formatVolume } from "./odds";

const POLYMARKET_BASE_URL = "https://gamma-api.polymarket.com";

/**
 * Raw Polymarket market response from API
 * Note: outcomes and outcomePrices come as JSON strings from the API
 */
export interface PolymarketMarketRaw {
  id: string;
  question: string;
  description: string;
  outcomes: string; // JSON string like "[\"Yes\", \"No\"]"
  outcomePrices: string; // JSON string like "[\"0.65\", \"0.35\"]"
  volume: string;
  liquidity: string;
  endDate: string;
  image: string;
  icon: string;
  tags: string[] | null;
  active: boolean;
  closed: boolean;
  new: boolean;
  featured: boolean;
  slug: string;
}

/**
 * Transformed market data for our app
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
  category?: "sports" | "politics" | "crypto" | "entertainment" | "pop-culture" | "business";
  search?: string;
  limit?: number;
  activeOnly?: boolean;
}

/**
 * Map category names to Polymarket tags
 */
const CATEGORY_TO_TAG: Record<string, string> = {
  sports: "sports",
  politics: "politics",
  crypto: "crypto",
  entertainment: "entertainment",
  "pop-culture": "pop-culture",
  business: "business",
};

/**
 * Keywords for smart category detection (since Polymarket tagging is unreliable)
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  sports: [
    "nba", "nfl", "mlb", "nhl", "super bowl", "superbowl", "supá bowl",
    "world series", "stanley cup", "mvp", "olympics", "basketball",
    "football", "baseball", "hockey", "soccer", "tennis", "golf",
    "ufc", "boxing", "mma", "f1", "formula", "nascar", "pga",
    "wimbledon", "french open", "us open", "champions league",
    "world cup", "premier league", "la liga", "serie a", "bundesliga",
    "celtics", "lakers", "warriors", "nets", "chiefs", "eagles",
    "patriots", "cowboys", "yankees", "dodgers", "braves", "mets",
    "halftime", "touchdown", "home run", "slam dunk", "penalty",
    "referee", "coach", "player", "team", "game", "match", "score",
    "spread", "over/under", "o/u", "moneyline", "underdog",
  ],
  politics: [
    "president", "election", "senate", "congress", "governor",
    "republican", "democrat", "gop", "dnc", "trump", "biden",
    "vote", "ballot", "primary", "nominee", "cabinet", "congress",
    "house", "supreme court", "legislation", "bill", "law",
    "poll", "approval rating", "impeachment", "veto",
  ],
  crypto: [
    "bitcoin", "btc", "ethereum", "eth", "crypto", "solana", "sol",
    "dogecoin", "doge", "cardano", "ada", "xrp", "ripple",
    "binance", "coinbase", "defi", "nft", "blockchain", "token",
    "altcoin", "mining", "staking", "wallet", "exchange",
  ],
  entertainment: [
    "oscar", "grammy", "emmy", "golden globe", "academy award",
    "netflix", "hulu", "disney", "hbo", "movie", "film", "album",
    "billboard", "box office", "streaming", "concert", "tour",
    "celebrity", "actor", "actress", "director", "producer",
  ],
  "pop-culture": [
    "taylor swift", "kanye", "kardashian", "jenner", "elon musk",
    "twitter", "tiktok", "instagram", "youtube", "viral",
    "meme", "influencer", "podcast", "celebrity", "drama",
  ],
  business: [
    "stock", "nasdaq", "dow", "s&p", "fed", "interest rate",
    "gdp", "inflation", "recession", "earnings", "revenue",
    "ipo", "merger", "acquisition", "startup", "unicorn",
    "apple", "google", "amazon", "microsoft", "nvidia", "tesla",
  ],
};

/**
 * Check if a market matches a category based on keywords
 */
function matchesCategory(market: ExternalMarket, category: string): boolean {
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords) return true; // No keywords = no filtering

  const titleLower = market.title.toLowerCase();
  const descLower = market.description.toLowerCase();
  const combined = titleLower + " " + descLower;

  return keywords.some((keyword) => combined.includes(keyword.toLowerCase()));
}

/**
 * Safely parse JSON string to array
 */
function parseJsonArray(jsonStr: string | null | undefined): string[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Transform raw Polymarket response to our format
 */
function transformMarket(raw: PolymarketMarketRaw): ExternalMarket {
  // Parse JSON strings to arrays
  const outcomeNames = parseJsonArray(raw.outcomes);
  const outcomePrices = parseJsonArray(raw.outcomePrices);

  const options = outcomeNames.map((name, index) => {
    const probabilityStr = outcomePrices[index] || "0";
    const probability = parseFloat(probabilityStr);
    return {
      name,
      probability,
      americanOdds: probabilityToAmericanOdds(probability),
    };
  });

  const volumeRaw = parseFloat(raw.volume) || 0;

  return {
    id: raw.id,
    source: "polymarket",
    title: raw.question,
    description: raw.description || "",
    options,
    volume: formatVolume(volumeRaw),
    volumeRaw,
    endDate: raw.endDate,
    imageUrl: raw.image || raw.icon || "",
    tags: raw.tags || [],
    sourceUrl: `https://polymarket.com/event/${raw.slug || raw.id}`,
    active: raw.active && !raw.closed,
  };
}

/**
 * Fetch markets from Polymarket API
 */
export async function fetchPolymarketMarkets(
  options: BrowseMarketsOptions = {}
): Promise<ExternalMarket[]> {
  const { category, search, limit = 20, activeOnly = true } = options;

  const params = new URLSearchParams();

  // Add limit
  params.set("limit", String(Math.min(limit, 100)));

  // Add tag filter for category
  if (category && CATEGORY_TO_TAG[category]) {
    params.set("tag", CATEGORY_TO_TAG[category]);
  }

  // Add active filter
  if (activeOnly) {
    params.set("active", "true");
    params.set("closed", "false");
  }

  // Add order (most volume first for relevance)
  params.set("order", "volume");
  params.set("ascending", "false");

  const url = `${POLYMARKET_BASE_URL}/markets?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const rawMarkets: PolymarketMarketRaw[] = await response.json();

    let markets = rawMarkets
      .map(transformMarket)
      // Filter out markets with no options or inactive markets
      .filter((m) => m.options.length >= 2 && m.active);

    // Client-side category filter (API tagging is unreliable)
    if (category && CATEGORY_KEYWORDS[category]) {
      markets = markets.filter((m) => matchesCategory(m, category));
    }

    // Client-side search filter (API doesn't support text search)
    if (search) {
      // Normalize search: lowercase, remove spaces and accents for flexible matching
      // This allows "superbowl", "supabowl", "Supá Bowl" to all match "Super Bowl"
      const normalize = (str: string) =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove accents
          .replace(/\s+/g, ""); // Remove spaces

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

    // Limit results
    return markets.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch Polymarket markets:", error);
    throw error;
  }
}

/**
 * Fetch a single market by ID
 */
export async function fetchPolymarketMarket(
  marketId: string
): Promise<ExternalMarket | null> {
  const url = `${POLYMARKET_BASE_URL}/markets/${marketId}`;

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
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const rawMarket: PolymarketMarketRaw = await response.json();
    return transformMarket(rawMarket);
  } catch (error) {
    console.error(`Failed to fetch Polymarket market ${marketId}:`, error);
    throw error;
  }
}

/**
 * Raw Polymarket event response from API (contains multiple markets)
 */
interface PolymarketEventRaw {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  markets: PolymarketMarketRaw[];
}

/**
 * Fetch market(s) by slug (for URL import)
 * Supports formats:
 * - https://polymarket.com/event/super-bowl-lx-coin-toss
 * - super-bowl-lx-coin-toss
 */
export async function fetchPolymarketBySlug(
  slugOrUrl: string
): Promise<ExternalMarket[]> {
  // Extract slug from URL if needed
  let slug = slugOrUrl;
  if (slugOrUrl.includes("polymarket.com")) {
    const match = slugOrUrl.match(/polymarket\.com\/event\/([^/?#]+)/);
    if (match) {
      slug = match[1];
    }
  }

  // Try events endpoint first (most reliable for URL imports)
  const eventsUrl = `${POLYMARKET_BASE_URL}/events?slug=${encodeURIComponent(slug)}`;

  try {
    const eventsResponse = await fetch(eventsUrl, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (eventsResponse.ok) {
      const events: PolymarketEventRaw[] = await eventsResponse.json();

      if (events.length > 0 && events[0].markets?.length > 0) {
        // Transform all markets from the event
        return events[0].markets
          .map(transformMarket)
          .filter((m) => m.options.length >= 2);
      }
    }

    // Fall back to markets endpoint
    const marketsUrl = `${POLYMARKET_BASE_URL}/markets?slug=${encodeURIComponent(slug)}&limit=50`;
    const marketsResponse = await fetch(marketsUrl, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!marketsResponse.ok) {
      throw new Error(`Polymarket API error: ${marketsResponse.status}`);
    }

    const rawMarkets: PolymarketMarketRaw[] = await marketsResponse.json();

    return rawMarkets
      .map(transformMarket)
      .filter((m) => m.options.length >= 2);
  } catch (error) {
    console.error(`Failed to fetch Polymarket market by slug ${slug}:`, error);
    throw error;
  }
}

/**
 * Parse a Polymarket URL and extract the slug
 */
export function parsePolymarketUrl(url: string): string | null {
  const match = url.match(/polymarket\.com\/event\/([^/?#]+)/);
  return match ? match[1] : null;
}

/**
 * Category definitions for UI
 */
export const MARKET_CATEGORIES = [
  { id: "sports", label: "Sports", icon: "Trophy" },
  { id: "politics", label: "Politics", icon: "Landmark" },
  { id: "crypto", label: "Crypto", icon: "Bitcoin" },
  { id: "entertainment", label: "Entertainment", icon: "Film" },
  { id: "pop-culture", label: "Pop Culture", icon: "Star" },
  { id: "business", label: "Business", icon: "TrendingUp" },
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number]["id"];
