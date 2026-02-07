import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/db";
import {
  parlays,
  parlayLegs,
  bets,
  betOptions,
  groupMemberships,
  memberCredits,
  creditTransactions,
} from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { americanToDecimal } from "@/lib/odds";

// Helper to verify group membership
async function verifyGroupMembership(userId: string, groupId: string) {
  const membership = await db.query.groupMemberships.findFirst({
    where: and(
      eq(groupMemberships.groupId, groupId),
      eq(groupMemberships.userId, userId),
      eq(groupMemberships.status, "approved")
    ),
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this group",
    });
  }

  return membership;
}

// Helper function to settle a parlay
async function settleParlay(parlayId: string, result: "won" | "lost") {
  const parlay = await db.query.parlays.findFirst({
    where: eq(parlays.id, parlayId),
  });

  if (!parlay || parlay.result !== "pending") return;

  const parlayAmount = parseFloat(parlay.amount);
  const payout = parseFloat(parlay.potentialPayout);

  // Get user's credits
  const credits = await db.query.memberCredits.findFirst({
    where: and(
      eq(memberCredits.userId, parlay.userId),
      eq(memberCredits.groupId, parlay.groupId)
    ),
  });

  if (credits) {
    const currentAvailable = parseFloat(credits.availableBalance);
    const currentAllocated = parseFloat(credits.allocatedBalance);

    let newAvailable: number;
    let newAllocated: number;
    let transactionType: "parlay_won" | "parlay_lost";
    let transactionAmount: number;
    let note: string;

    if (result === "won") {
      // Winner gets payout
      newAvailable = currentAvailable + payout;
      newAllocated = currentAllocated - parlayAmount;
      transactionType = "parlay_won";
      transactionAmount = payout;
      note = `Parlay won! Payout: ${payout.toFixed(2)}`;
    } else {
      // Loser forfeits stake
      newAvailable = currentAvailable;
      newAllocated = currentAllocated - parlayAmount;
      transactionType = "parlay_lost";
      transactionAmount = -parlayAmount;
      note = "Parlay lost";
    }

    // Update credits
    await db
      .update(memberCredits)
      .set({
        availableBalance: newAvailable.toFixed(2),
        allocatedBalance: newAllocated.toFixed(2),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(memberCredits.userId, parlay.userId),
          eq(memberCredits.groupId, parlay.groupId)
        )
      );

    // Log credit transaction
    await db.insert(creditTransactions).values({
      userId: parlay.userId,
      groupId: parlay.groupId,
      type: transactionType,
      amount: transactionAmount.toFixed(2),
      balanceAfter: newAvailable.toFixed(2),
      allocatedAfter: newAllocated.toFixed(2),
      parlayId: parlay.id,
      note,
    });
  }

  // Update parlay result
  await db
    .update(parlays)
    .set({
      result,
      settledAt: new Date(),
    })
    .where(eq(parlays.id, parlayId));
}

export const parlaysRouter = router({
  // Get all parlays for a user in a group
  getMyParlays: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const userParlays = await db.query.parlays.findMany({
        where: and(
          eq(parlays.groupId, input.groupId),
          eq(parlays.userId, ctx.user.id)
        ),
        with: {
          legs: {
            with: {
              bet: true,
              option: true,
            },
          },
        },
        orderBy: [desc(parlays.createdAt)],
      });

      return userParlays;
    }),

  // Get all group parlays (for leaderboard/visibility)
  getByGroup: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const groupParlays = await db.query.parlays.findMany({
        where: eq(parlays.groupId, input.groupId),
        with: {
          user: true,
          legs: {
            with: {
              bet: true,
              option: true,
            },
          },
        },
        orderBy: [desc(parlays.createdAt)],
      });

      return groupParlays;
    }),

  // Get a specific parlay
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const parlay = await db.query.parlays.findFirst({
        where: eq(parlays.id, input.id),
        with: {
          user: true,
          group: true,
          legs: {
            with: {
              bet: {
                with: {
                  createdBy: true,
                },
              },
              option: true,
            },
          },
        },
      });

      if (!parlay) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parlay not found",
        });
      }

      await verifyGroupMembership(ctx.user.id, parlay.groupId);

      return parlay;
    }),

  // Place a parlay
  create: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        amount: z.number().positive("Amount must be positive").max(1000000),
        legs: z
          .array(
            z.object({
              betId: z.string().uuid(),
              optionId: z.string().uuid(),
            })
          )
          .min(2, "Parlay must have at least 2 legs")
          .max(10, "Maximum 10 legs in a parlay"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      // Validate all legs belong to different bets in this group
      const betIds = input.legs.map((l) => l.betId);
      const uniqueBetIds = new Set(betIds);
      if (uniqueBetIds.size !== betIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Each leg must be from a different bet",
        });
      }

      // Fetch all bet options and verify they're valid
      const options = await db.query.betOptions.findMany({
        where: inArray(
          betOptions.id,
          input.legs.map((l) => l.optionId)
        ),
        with: {
          bet: true,
        },
      });

      if (options.length !== input.legs.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more options not found",
        });
      }

      // Validate each leg
      const legsWithOdds: { betId: string; optionId: string; odds: number; optionName: string; betTitle: string }[] = [];
      for (const leg of input.legs) {
        const option = options.find((o) => o.id === leg.optionId);
        if (!option) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Option not found",
          });
        }

        // Verify option belongs to the correct bet
        if (option.betId !== leg.betId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Option does not belong to the specified bet",
          });
        }

        // Verify bet is in this group
        if (option.bet.groupId !== input.groupId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Bet does not belong to this group",
          });
        }

        // Verify bet is open
        if (option.bet.status !== "open") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Bet "${option.bet.title}" is no longer open for betting`,
          });
        }

        // Check if bet is locked
        if (option.bet.locksAt && new Date() > option.bet.locksAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Betting is closed for "${option.bet.title}"`,
          });
        }

        legsWithOdds.push({
          betId: leg.betId,
          optionId: leg.optionId,
          odds: option.americanOdds,
          optionName: option.name,
          betTitle: option.bet.title,
        });
      }

      // Calculate combined odds (multiply decimal odds)
      const combinedDecimalOdds = legsWithOdds.reduce((acc, leg) => {
        return acc * americanToDecimal(leg.odds);
      }, 1);

      // Calculate potential payout (stake * combined decimal odds)
      const potentialPayout = input.amount * combinedDecimalOdds;

      // Check user's available credits
      const credits = await db.query.memberCredits.findFirst({
        where: and(
          eq(memberCredits.userId, ctx.user.id),
          eq(memberCredits.groupId, input.groupId)
        ),
      });

      if (!credits) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You don't have credits in this group",
        });
      }

      const currentAvailable = parseFloat(credits.availableBalance);
      const currentAllocated = parseFloat(credits.allocatedBalance);

      if (currentAvailable < input.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient credits. Available: ${currentAvailable.toFixed(2)}, Required: ${input.amount.toFixed(2)}`,
        });
      }

      const newAvailable = currentAvailable - input.amount;
      const newAllocated = currentAllocated + input.amount;

      // Create parlay
      const [parlay] = await db
        .insert(parlays)
        .values({
          groupId: input.groupId,
          userId: ctx.user.id,
          amount: input.amount.toFixed(2),
          combinedDecimalOdds: combinedDecimalOdds.toFixed(6),
          potentialPayout: potentialPayout.toFixed(2),
        })
        .returning();

      // Create parlay legs
      const legValues = legsWithOdds.map((leg) => ({
        parlayId: parlay.id,
        betId: leg.betId,
        optionId: leg.optionId,
        oddsAtPlacement: leg.odds,
      }));

      await db.insert(parlayLegs).values(legValues);

      // Update credits
      await db
        .update(memberCredits)
        .set({
          availableBalance: newAvailable.toFixed(2),
          allocatedBalance: newAllocated.toFixed(2),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(memberCredits.userId, ctx.user.id),
            eq(memberCredits.groupId, input.groupId)
          )
        );

      // Log credit transaction
      const legsSummary = legsWithOdds
        .map((l) => `${l.optionName}`)
        .join(" + ");
      await db.insert(creditTransactions).values({
        userId: ctx.user.id,
        groupId: input.groupId,
        type: "parlay_placed",
        amount: (-input.amount).toFixed(2),
        balanceAfter: newAvailable.toFixed(2),
        allocatedAfter: newAllocated.toFixed(2),
        parlayId: parlay.id,
        note: `Parlay: ${legsSummary}`,
      });

      return { ...parlay, legs: legValues };
    }),

  // Cancel a parlay (only if all legs are still open)
  cancel: protectedProcedure
    .input(z.object({ parlayId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const parlay = await db.query.parlays.findFirst({
        where: eq(parlays.id, input.parlayId),
        with: {
          legs: {
            with: {
              bet: true,
            },
          },
        },
      });

      if (!parlay) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parlay not found",
        });
      }

      // Only owner can cancel
      if (parlay.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only cancel your own parlays",
        });
      }

      // Can only cancel if result is still pending
      if (parlay.result !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel a settled parlay",
        });
      }

      // All legs must be from open bets
      const lockedLegs = parlay.legs.filter(
        (leg) => leg.bet.status !== "open"
      );
      if (lockedLegs.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel parlay - one or more bets have been locked or settled",
        });
      }

      const parlayAmount = parseFloat(parlay.amount);

      // Get current credits
      const credits = await db.query.memberCredits.findFirst({
        where: and(
          eq(memberCredits.userId, ctx.user.id),
          eq(memberCredits.groupId, parlay.groupId)
        ),
      });

      if (credits) {
        const currentAvailable = parseFloat(credits.availableBalance);
        const currentAllocated = parseFloat(credits.allocatedBalance);
        const newAvailable = currentAvailable + parlayAmount;
        const newAllocated = currentAllocated - parlayAmount;

        // Refund credits
        await db
          .update(memberCredits)
          .set({
            availableBalance: newAvailable.toFixed(2),
            allocatedBalance: newAllocated.toFixed(2),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(memberCredits.userId, ctx.user.id),
              eq(memberCredits.groupId, parlay.groupId)
            )
          );

        // Log credit transaction
        await db.insert(creditTransactions).values({
          userId: ctx.user.id,
          groupId: parlay.groupId,
          type: "parlay_cancelled",
          amount: parlayAmount.toFixed(2),
          balanceAfter: newAvailable.toFixed(2),
          allocatedAfter: newAllocated.toFixed(2),
          parlayId: parlay.id,
          note: "Parlay cancelled",
        });
      }

      // Delete the parlay (cascade deletes legs)
      await db.delete(parlays).where(eq(parlays.id, input.parlayId));

      return { success: true };
    }),

  // Settle parlay legs when a bet is settled (called internally)
  settleLegsByBet: protectedProcedure
    .input(
      z.object({
        betId: z.string().uuid(),
        winningOptionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find all parlay legs that include this bet
      const affectedLegs = await db.query.parlayLegs.findMany({
        where: eq(parlayLegs.betId, input.betId),
        with: {
          parlay: {
            with: {
              legs: {
                with: {
                  bet: true,
                },
              },
            },
          },
        },
      });

      for (const leg of affectedLegs) {
        const parlay = leg.parlay;
        if (parlay.result !== "pending") continue;

        const isLegWinner = leg.optionId === input.winningOptionId;

        // Update leg result
        await db
          .update(parlayLegs)
          .set({ result: isLegWinner ? "won" : "lost" })
          .where(eq(parlayLegs.id, leg.id));

        if (!isLegWinner) {
          // Leg lost = entire parlay loses
          await settleParlay(parlay.id, "lost");
        } else {
          // Check if all legs are now settled and won
          // Refetch parlay legs to get updated results
          const updatedParlay = await db.query.parlays.findFirst({
            where: eq(parlays.id, parlay.id),
            with: {
              legs: {
                with: {
                  bet: true,
                },
              },
            },
          });

          if (updatedParlay && updatedParlay.result === "pending") {
            const allLegsSettled = updatedParlay.legs.every(
              (l) => l.bet.status === "settled"
            );
            const allLegsWon = updatedParlay.legs.every(
              (l) => l.result === "won"
            );

            if (allLegsSettled && allLegsWon) {
              await settleParlay(parlay.id, "won");
            }
          }
        }
      }

      return { success: true };
    }),
});
