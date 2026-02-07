import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/db";
import {
  bets,
  betOptions,
  wagers,
  groupMemberships,
  memberCredits,
  creditTransactions,
  groups,
  parlayLegs,
  parlays,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { calculatePayout, isValidAmericanOdds } from "@/lib/odds";

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

// Helper to settle parlay when it's complete (won) or any leg fails (lost)
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
      newAvailable = currentAvailable + payout;
      newAllocated = currentAllocated - parlayAmount;
      transactionType = "parlay_won";
      transactionAmount = payout;
      note = `Parlay won! Payout: ${payout.toFixed(2)}`;
    } else {
      newAvailable = currentAvailable;
      newAllocated = currentAllocated - parlayAmount;
      transactionType = "parlay_lost";
      transactionAmount = -parlayAmount;
      note = "Parlay lost";
    }

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

  await db
    .update(parlays)
    .set({
      result,
      settledAt: new Date(),
    })
    .where(eq(parlays.id, parlayId));
}

// Settle parlay legs when a bet is settled
async function settleParlayLegsForBet(betId: string, winningOptionId: string) {
  const affectedLegs = await db.query.parlayLegs.findMany({
    where: eq(parlayLegs.betId, betId),
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

    const isLegWinner = leg.optionId === winningOptionId;

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
}

// Input validation for bet options
const betOptionSchema = z.object({
  name: z.string().min(1, "Option name is required").max(100),
  description: z.string().max(500).optional(),
  americanOdds: z
    .number()
    .refine((val) => isValidAmericanOdds(val), {
      message: "Odds must be +100 or higher, or -100 or lower",
    }),
});

export const betsRouter = router({
  // Create a new bet with options
  create: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        title: z.string().min(1, "Title is required").max(200),
        description: z.string().max(1000).optional(),
        eventDate: z.date().optional(),
        locksAt: z.date().optional(),
        options: z
          .array(betOptionSchema)
          .min(2, "At least 2 options required")
          .max(10, "Maximum 10 options allowed"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      // Create the bet
      const [bet] = await db
        .insert(bets)
        .values({
          groupId: input.groupId,
          createdById: ctx.user.id,
          title: input.title,
          description: input.description,
          eventDate: input.eventDate,
          locksAt: input.locksAt,
        })
        .returning();

      // Create all options
      const optionsToInsert = input.options.map((opt, index) => ({
        betId: bet.id,
        name: opt.name,
        description: opt.description,
        americanOdds: opt.americanOdds,
        order: index,
      }));

      const createdOptions = await db
        .insert(betOptions)
        .values(optionsToInsert)
        .returning();

      return { ...bet, options: createdOptions };
    }),

  // Get all bets in a group
  getByGroup: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const groupBets = await db.query.bets.findMany({
        where: eq(bets.groupId, input.groupId),
        with: {
          createdBy: true,
          options: {
            orderBy: (betOptions, { asc }) => [asc(betOptions.order)],
          },
          wagers: {
            with: {
              user: true,
              option: true,
            },
          },
        },
        orderBy: [desc(bets.createdAt)],
      });

      return groupBets;
    }),

  // Get a specific bet with all details
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bet = await db.query.bets.findFirst({
        where: eq(bets.id, input.id),
        with: {
          createdBy: true,
          group: true,
          options: {
            orderBy: (betOptions, { asc }) => [asc(betOptions.order)],
            with: {
              wagers: {
                with: {
                  user: true,
                },
              },
            },
          },
          wagers: {
            with: {
              user: true,
              option: true,
            },
          },
        },
      });

      if (!bet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bet not found",
        });
      }

      await verifyGroupMembership(ctx.user.id, bet.groupId);

      return bet;
    }),

  // Place a wager on an option
  placeWager: protectedProcedure
    .input(
      z.object({
        optionId: z.string().uuid(),
        amount: z.number().positive("Amount must be positive").max(1000000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the option with its bet
      const option = await db.query.betOptions.findFirst({
        where: eq(betOptions.id, input.optionId),
        with: {
          bet: true,
        },
      });

      if (!option) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Option not found",
        });
      }

      const bet = option.bet;

      // Check bet status
      if (bet.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This bet is no longer open for wagers",
        });
      }

      // Check if bet is locked
      if (bet.locksAt && new Date() > bet.locksAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Betting is closed for this event",
        });
      }

      await verifyGroupMembership(ctx.user.id, bet.groupId);

      // Check if bet creator is allowed to wager on their own bet
      if (bet.createdById === ctx.user.id) {
        const group = await db.query.groups.findFirst({
          where: eq(groups.id, bet.groupId),
        });
        if (group && !group.allowCreatorWagers) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Bet creators cannot wager on their own bets in this group",
          });
        }
      }

      // Check if user already has a wager on this bet
      const existingWager = await db.query.wagers.findFirst({
        where: and(
          eq(wagers.betId, bet.id),
          eq(wagers.userId, ctx.user.id)
        ),
      });

      if (existingWager) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a wager on this bet. Delete it first to place a new one.",
        });
      }

      // Calculate potential payout
      const potentialPayout = calculatePayout(option.americanOdds, input.amount);

      // Use a transaction with row lock for credit deduction
      // Get current credits with FOR UPDATE lock
      const credits = await db.query.memberCredits.findFirst({
        where: and(
          eq(memberCredits.userId, ctx.user.id),
          eq(memberCredits.groupId, bet.groupId)
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

      // Create wager
      const [wager] = await db
        .insert(wagers)
        .values({
          betId: bet.id,
          optionId: input.optionId,
          userId: ctx.user.id,
          amount: input.amount.toString(),
          oddsAtWager: option.americanOdds,
          potentialPayout: potentialPayout.toFixed(2),
        })
        .returning();

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
            eq(memberCredits.groupId, bet.groupId)
          )
        );

      // Log credit transaction
      await db.insert(creditTransactions).values({
        userId: ctx.user.id,
        groupId: bet.groupId,
        type: "wager_placed",
        amount: (-input.amount).toFixed(2),
        balanceAfter: newAvailable.toFixed(2),
        allocatedAfter: newAllocated.toFixed(2),
        wagerId: wager.id,
        betId: bet.id,
        note: `Wager on "${option.name}"`,
      });

      return wager;
    }),

  // Cancel/remove a wager
  cancelWager: protectedProcedure
    .input(z.object({ wagerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const wager = await db.query.wagers.findFirst({
        where: eq(wagers.id, input.wagerId),
        with: {
          bet: true,
          option: true,
        },
      });

      if (!wager) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Wager not found",
        });
      }

      // Only the wager owner can cancel
      if (wager.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only cancel your own wagers",
        });
      }

      // Can only cancel if bet is still open
      if (wager.bet.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel wager on a locked or settled bet",
        });
      }

      const wagerAmount = parseFloat(wager.amount);

      // Get current credits
      const credits = await db.query.memberCredits.findFirst({
        where: and(
          eq(memberCredits.userId, ctx.user.id),
          eq(memberCredits.groupId, wager.bet.groupId)
        ),
      });

      if (credits) {
        const currentAvailable = parseFloat(credits.availableBalance);
        const currentAllocated = parseFloat(credits.allocatedBalance);
        const newAvailable = currentAvailable + wagerAmount;
        const newAllocated = currentAllocated - wagerAmount;

        // Update credits - move from allocated back to available
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
              eq(memberCredits.groupId, wager.bet.groupId)
            )
          );

        // Log credit transaction
        await db.insert(creditTransactions).values({
          userId: ctx.user.id,
          groupId: wager.bet.groupId,
          type: "wager_cancelled",
          amount: wagerAmount.toFixed(2),
          balanceAfter: newAvailable.toFixed(2),
          allocatedAfter: newAllocated.toFixed(2),
          wagerId: wager.id,
          betId: wager.bet.id,
          note: `Cancelled wager on "${wager.option?.name}"`,
        });
      }

      await db.delete(wagers).where(eq(wagers.id, input.wagerId));

      return { success: true };
    }),

  // Lock a bet (no more wagers accepted)
  lock: protectedProcedure
    .input(z.object({ betId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const bet = await db.query.bets.findFirst({
        where: eq(bets.id, input.betId),
      });

      if (!bet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bet not found",
        });
      }

      const membership = await verifyGroupMembership(ctx.user.id, bet.groupId);
      const isCreator = bet.createdById === ctx.user.id;
      const isAdmin = membership.role === "admin";

      if (!isCreator && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the bet creator or group admin can lock the bet",
        });
      }

      const [updatedBet] = await db
        .update(bets)
        .set({
          status: "locked",
          updatedAt: new Date(),
        })
        .where(eq(bets.id, input.betId))
        .returning();

      return updatedBet;
    }),

  // Settle a bet - declare a winning option
  settle: protectedProcedure
    .input(
      z.object({
        betId: z.string().uuid(),
        winningOptionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bet = await db.query.bets.findFirst({
        where: eq(bets.id, input.betId),
        with: {
          options: true,
          wagers: {
            with: {
              option: true,
            },
          },
        },
      });

      if (!bet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bet not found",
        });
      }

      const membership = await verifyGroupMembership(ctx.user.id, bet.groupId);
      const isCreator = bet.createdById === ctx.user.id;
      const isAdmin = membership.role === "admin";

      if (!isCreator && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the bet creator or group admin can settle the bet",
        });
      }

      // Verify the winning option exists
      const winningOption = bet.options.find((o) => o.id === input.winningOptionId);
      if (!winningOption) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid winning option",
        });
      }

      // Update the bet
      const [updatedBet] = await db
        .update(bets)
        .set({
          status: "settled",
          winningOptionId: input.winningOptionId,
          settledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bets.id, input.betId))
        .returning();

      // Process credit settlements for all wagers
      for (const wager of bet.wagers) {
        const isWinner = wager.optionId === input.winningOptionId;
        const wagerAmount = parseFloat(wager.amount);
        const payout = parseFloat(wager.potentialPayout);

        // Get user's current credits
        const credits = await db.query.memberCredits.findFirst({
          where: and(
            eq(memberCredits.userId, wager.userId),
            eq(memberCredits.groupId, bet.groupId)
          ),
        });

        if (credits) {
          const currentAvailable = parseFloat(credits.availableBalance);
          const currentAllocated = parseFloat(credits.allocatedBalance);

          let newAvailable: number;
          let newAllocated: number;
          let transactionType: "wager_won" | "wager_lost";
          let transactionAmount: number;
          let note: string;

          if (isWinner) {
            // Winner: allocated stake is released + they get the payout
            newAvailable = currentAvailable + payout;
            newAllocated = currentAllocated - wagerAmount;
            transactionType = "wager_won";
            transactionAmount = payout; // Net gain is payout (includes stake)
            note = `Won wager on "${wager.option?.name}" - Payout: ${payout.toFixed(2)}`;
          } else {
            // Loser: allocated stake is forfeited
            newAvailable = currentAvailable;
            newAllocated = currentAllocated - wagerAmount;
            transactionType = "wager_lost";
            transactionAmount = -wagerAmount; // Negative because they lost this amount
            note = `Lost wager on "${wager.option?.name}"`;
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
                eq(memberCredits.userId, wager.userId),
                eq(memberCredits.groupId, bet.groupId)
              )
            );

          // Log credit transaction
          await db.insert(creditTransactions).values({
            userId: wager.userId,
            groupId: bet.groupId,
            type: transactionType,
            amount: transactionAmount.toFixed(2),
            balanceAfter: newAvailable.toFixed(2),
            allocatedAfter: newAllocated.toFixed(2),
            wagerId: wager.id,
            betId: bet.id,
            note,
          });
        }

        // Update wager result
        await db
          .update(wagers)
          .set({ result: isWinner ? "won" : "lost" })
          .where(eq(wagers.id, wager.id));
      }

      // Settle any parlay legs that include this bet
      await settleParlayLegsForBet(input.betId, input.winningOptionId);

      return updatedBet;
    }),

  // Cancel a bet
  cancel: protectedProcedure
    .input(z.object({ betId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const bet = await db.query.bets.findFirst({
        where: eq(bets.id, input.betId),
        with: {
          wagers: {
            with: {
              option: true,
            },
          },
        },
      });

      if (!bet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bet not found",
        });
      }

      const membership = await verifyGroupMembership(ctx.user.id, bet.groupId);
      const isCreator = bet.createdById === ctx.user.id;
      const isAdmin = membership.role === "admin";

      if (!isCreator && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the bet creator or group admin can cancel the bet",
        });
      }

      // Update bet status
      const [updatedBet] = await db
        .update(bets)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(bets.id, input.betId))
        .returning();

      // Refund all wagers
      for (const wager of bet.wagers) {
        const wagerAmount = parseFloat(wager.amount);

        // Get user's current credits
        const credits = await db.query.memberCredits.findFirst({
          where: and(
            eq(memberCredits.userId, wager.userId),
            eq(memberCredits.groupId, bet.groupId)
          ),
        });

        if (credits) {
          const currentAvailable = parseFloat(credits.availableBalance);
          const currentAllocated = parseFloat(credits.allocatedBalance);
          const newAvailable = currentAvailable + wagerAmount;
          const newAllocated = currentAllocated - wagerAmount;

          // Update credits - move from allocated back to available
          await db
            .update(memberCredits)
            .set({
              availableBalance: newAvailable.toFixed(2),
              allocatedBalance: newAllocated.toFixed(2),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(memberCredits.userId, wager.userId),
                eq(memberCredits.groupId, bet.groupId)
              )
            );

          // Log credit transaction
          await db.insert(creditTransactions).values({
            userId: wager.userId,
            groupId: bet.groupId,
            type: "bet_cancelled",
            amount: wagerAmount.toFixed(2),
            balanceAfter: newAvailable.toFixed(2),
            allocatedAfter: newAllocated.toFixed(2),
            wagerId: wager.id,
            betId: bet.id,
            note: `Refund for cancelled bet: "${bet.title}"`,
          });
        }

        // Mark wager as push
        await db
          .update(wagers)
          .set({ result: "push" })
          .where(eq(wagers.id, wager.id));
      }

      return updatedBet;
    }),

  // Delete a bet (creator only, must have no wagers)
  delete: protectedProcedure
    .input(z.object({ betId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const bet = await db.query.bets.findFirst({
        where: eq(bets.id, input.betId),
        with: {
          wagers: true,
        },
      });

      if (!bet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bet not found",
        });
      }

      if (bet.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the bet creator can delete this bet",
        });
      }

      if (bet.wagers.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete a bet that has wagers. Cancel it instead.",
        });
      }

      await db.delete(bets).where(eq(bets.id, input.betId));

      return { success: true };
    }),

  // Get user's wagers in a group
  getMyWagers: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const userWagers = await db.query.wagers.findMany({
        where: eq(wagers.userId, ctx.user.id),
        with: {
          bet: {
            with: {
              group: true,
            },
          },
          option: true,
        },
      });

      // Filter to only wagers in the specified group
      return userWagers.filter((w) => w.bet.groupId === input.groupId);
    }),
});
