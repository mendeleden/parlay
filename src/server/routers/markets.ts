import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/db";
import { bets, betOptions, groupMemberships } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  fetchPolymarketMarkets,
  fetchPolymarketMarket,
  fetchPolymarketBySlug,
  type ExternalMarket,
  type MarketCategory,
} from "@/lib/polymarket";
import {
  fetchKalshiMarkets,
  fetchKalshiMarket,
} from "@/lib/kalshi";

// Helper to verify group admin
async function verifyGroupAdmin(userId: string, groupId: string) {
  const membership = await db.query.groupMemberships.findFirst({
    where: and(
      eq(groupMemberships.groupId, groupId),
      eq(groupMemberships.userId, userId),
      eq(groupMemberships.status, "approved"),
      eq(groupMemberships.role, "admin")
    ),
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only group admins can import markets",
    });
  }

  return membership;
}

// Fetch market by ID from any source
async function fetchMarketBySource(
  source: "polymarket" | "kalshi",
  marketId: string
): Promise<ExternalMarket | null> {
  if (source === "polymarket") {
    return fetchPolymarketMarket(marketId);
  } else if (source === "kalshi") {
    return fetchKalshiMarket(marketId);
  }
  return null;
}

export const marketsRouter = router({
  /**
   * Browse external markets from Polymarket or Kalshi (public - no auth required)
   */
  browse: publicProcedure
    .input(
      z.object({
        source: z.enum(["polymarket", "kalshi"]).default("polymarket"),
        category: z
          .enum([
            "sports",
            "politics",
            "crypto",
            "entertainment",
            "pop-culture",
            "business",
          ])
          .optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(30),
      })
    )
    .query(async ({ input }) => {
      const { source, category, search, limit } = input;

      try {
        let markets: ExternalMarket[] = [];

        if (source === "polymarket") {
          markets = await fetchPolymarketMarkets({
            category: category as MarketCategory,
            search,
            limit,
            activeOnly: true,
          });
        } else if (source === "kalshi") {
          markets = await fetchKalshiMarkets({
            category,
            search,
            limit,
          });
        }

        return {
          markets,
          hasMore: markets.length === limit,
        };
      } catch (error) {
        console.error(`Failed to fetch ${source} markets:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch markets from ${source}`,
        });
      }
    }),

  /**
   * Import by URL - fetch markets from a Polymarket or Kalshi URL
   */
  importByUrl: publicProcedure
    .input(
      z.object({
        url: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { url } = input;

      // Detect source from URL
      if (url.includes("polymarket.com")) {
        try {
          const markets = await fetchPolymarketBySlug(url);
          return {
            source: "polymarket" as const,
            markets,
          };
        } catch (error) {
          console.error("Failed to fetch from Polymarket URL:", error);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Could not find markets at that Polymarket URL",
          });
        }
      } else if (url.includes("kalshi.com")) {
        // Extract ticker from Kalshi URL
        // Format: https://kalshi.com/markets/EVENT_TICKER/MARKET_TICKER
        const match = url.match(/kalshi\.com\/markets\/[^/]+\/([^/?#]+)/);
        if (match) {
          const ticker = match[1];
          try {
            const market = await fetchKalshiMarket(ticker);
            if (market) {
              return {
                source: "kalshi" as const,
                markets: [market],
              };
            }
          } catch (error) {
            console.error("Failed to fetch from Kalshi URL:", error);
          }
        }
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Could not find market at that Kalshi URL",
        });
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "URL must be from polymarket.com or kalshi.com",
      });
    }),

  /**
   * Get details for a single market (public - no auth required)
   */
  getMarket: publicProcedure
    .input(
      z.object({
        source: z.enum(["polymarket", "kalshi"]).default("polymarket"),
        marketId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { source, marketId } = input;

      const market = await fetchMarketBySource(source, marketId);
      if (!market) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Market not found",
        });
      }
      return market;
    }),

  /**
   * Import a single market as a bet
   */
  import: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        source: z.enum(["polymarket", "kalshi"]).default("polymarket"),
        marketId: z.string(),
        customizations: z
          .object({
            title: z.string().optional(),
            description: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId, source, marketId, customizations } = input;

      // Verify user is group admin
      await verifyGroupAdmin(ctx.user.id, groupId);

      // Fetch the market data
      const market = await fetchMarketBySource(source, marketId);

      if (!market) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Market not found",
        });
      }

      // Create the bet with options in a transaction
      const result = await db.transaction(async (tx) => {
        // Create the bet
        const [newBet] = await tx
          .insert(bets)
          .values({
            groupId,
            createdById: ctx.user.id,
            title: customizations?.title || market.title,
            description:
              customizations?.description ||
              `${market.description}\n\nImported from ${source}: ${market.sourceUrl}`,
            status: "open",
            eventDate: market.endDate ? new Date(market.endDate) : null,
            locksAt: market.endDate ? new Date(market.endDate) : null,
          })
          .returning();

        // Create bet options
        const optionValues = market.options.map((option, index) => ({
          betId: newBet.id,
          name: option.name,
          americanOdds: option.americanOdds,
          order: index,
        }));

        await tx.insert(betOptions).values(optionValues);

        return newBet;
      });

      return {
        betId: result.id,
        title: result.title,
      };
    }),

  /**
   * Import multiple markets as bets (batch import)
   */
  importBatch: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        markets: z.array(
          z.object({
            source: z.enum(["polymarket", "kalshi"]).default("polymarket"),
            marketId: z.string(),
            customizations: z
              .object({
                title: z.string().optional(),
                description: z.string().optional(),
              })
              .optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId, markets } = input;

      // Verify user is group admin
      await verifyGroupAdmin(ctx.user.id, groupId);

      const results: Array<{
        marketId: string;
        betId: string;
        title: string;
        success: boolean;
        error?: string;
      }> = [];

      // Import each market
      for (const marketInput of markets) {
        try {
          // Fetch the market data
          const market = await fetchMarketBySource(
            marketInput.source,
            marketInput.marketId
          );

          if (!market) {
            results.push({
              marketId: marketInput.marketId,
              betId: "",
              title: "",
              success: false,
              error: "Market not found",
            });
            continue;
          }

          // Create the bet with options in a transaction
          const result = await db.transaction(async (tx) => {
            // Create the bet
            const [newBet] = await tx
              .insert(bets)
              .values({
                groupId,
                createdById: ctx.user.id,
                title: marketInput.customizations?.title || market.title,
                description:
                  marketInput.customizations?.description ||
                  `${market.description}\n\nImported from ${marketInput.source}: ${market.sourceUrl}`,
                status: "open",
                eventDate: market.endDate ? new Date(market.endDate) : null,
                locksAt: market.endDate ? new Date(market.endDate) : null,
              })
              .returning();

            // Create bet options
            const optionValues = market.options.map((option, index) => ({
              betId: newBet.id,
              name: option.name,
              americanOdds: option.americanOdds,
              order: index,
            }));

            await tx.insert(betOptions).values(optionValues);

            return newBet;
          });

          results.push({
            marketId: marketInput.marketId,
            betId: result.id,
            title: result.title,
            success: true,
          });
        } catch (error) {
          results.push({
            marketId: marketInput.marketId,
            betId: "",
            title: "",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        imported: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    }),
});
