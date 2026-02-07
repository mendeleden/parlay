import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/db";
import {
  memberCredits,
  creditTransactions,
  groupMemberships,
  users,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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

// Helper to verify admin role
async function verifyGroupAdmin(userId: string, groupId: string) {
  const membership = await verifyGroupMembership(userId, groupId);

  if (membership.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can perform this action",
    });
  }

  return membership;
}

export const creditsRouter = router({
  // Get current user's credits in a group
  getMyCredits: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const credits = await db.query.memberCredits.findFirst({
        where: and(
          eq(memberCredits.userId, ctx.user.id),
          eq(memberCredits.groupId, input.groupId)
        ),
      });

      if (!credits) {
        return {
          availableBalance: "0",
          allocatedBalance: "0",
          totalBalance: "0",
        };
      }

      const available = parseFloat(credits.availableBalance);
      const allocated = parseFloat(credits.allocatedBalance);

      return {
        availableBalance: credits.availableBalance,
        allocatedBalance: credits.allocatedBalance,
        totalBalance: (available + allocated).toFixed(2),
      };
    }),

  // Get all members' credits for leaderboard
  getGroupCredits: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const allCredits = await db.query.memberCredits.findMany({
        where: eq(memberCredits.groupId, input.groupId),
        with: {
          user: true,
        },
      });

      // Calculate total balance and sort by it
      const creditsList = allCredits
        .map((credit) => {
          const available = parseFloat(credit.availableBalance);
          const allocated = parseFloat(credit.allocatedBalance);
          return {
            userId: credit.userId,
            username: credit.user.username,
            avatar: credit.user.avatar,
            availableBalance: credit.availableBalance,
            allocatedBalance: credit.allocatedBalance,
            totalBalance: (available + allocated).toFixed(2),
          };
        })
        .sort((a, b) => parseFloat(b.totalBalance) - parseFloat(a.totalBalance));

      return creditsList;
    }),

  // Admin adjust credits (add or remove)
  adjustCredits: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        targetUserId: z.string().uuid(),
        amount: z.number().refine((val) => val !== 0, {
          message: "Amount cannot be zero",
        }),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyGroupAdmin(ctx.user.id, input.groupId);

      // Verify target user is a member
      await verifyGroupMembership(input.targetUserId, input.groupId);

      // Get current credits
      const currentCredits = await db.query.memberCredits.findFirst({
        where: and(
          eq(memberCredits.userId, input.targetUserId),
          eq(memberCredits.groupId, input.groupId)
        ),
      });

      const currentAvailable = currentCredits
        ? parseFloat(currentCredits.availableBalance)
        : 0;
      const currentAllocated = currentCredits
        ? parseFloat(currentCredits.allocatedBalance)
        : 0;

      // Check if reduction would make available negative
      if (input.amount < 0 && currentAvailable + input.amount < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot reduce credits below 0. Current available: ${currentAvailable.toFixed(2)}`,
        });
      }

      const newAvailable = currentAvailable + input.amount;

      // Update or insert credits
      if (currentCredits) {
        await db
          .update(memberCredits)
          .set({
            availableBalance: newAvailable.toFixed(2),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(memberCredits.userId, input.targetUserId),
              eq(memberCredits.groupId, input.groupId)
            )
          );
      } else {
        await db.insert(memberCredits).values({
          userId: input.targetUserId,
          groupId: input.groupId,
          availableBalance: newAvailable.toFixed(2),
          allocatedBalance: "0",
        });
      }

      // Log the transaction
      await db.insert(creditTransactions).values({
        userId: input.targetUserId,
        groupId: input.groupId,
        type: "admin_adjustment",
        amount: input.amount.toFixed(2),
        balanceAfter: newAvailable.toFixed(2),
        allocatedAfter: currentAllocated.toFixed(2),
        adjustedByUserId: ctx.user.id,
        note: input.note,
      });

      return {
        success: true,
        newAvailableBalance: newAvailable.toFixed(2),
        newTotalBalance: (newAvailable + currentAllocated).toFixed(2),
      };
    }),

  // Get transaction history for a user in a group
  getTransactionHistory: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const transactions = await db.query.creditTransactions.findMany({
        where: and(
          eq(creditTransactions.userId, ctx.user.id),
          eq(creditTransactions.groupId, input.groupId)
        ),
        orderBy: [desc(creditTransactions.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          bet: true,
          adjustedBy: true,
        },
      });

      return transactions;
    }),
});
