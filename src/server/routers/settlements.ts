import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/db";
import {
  settlements,
  groupMemberships,
  memberCredits,
  users,
  groups,
} from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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

export const settlementsRouter = router({
  // Get admin's payment handles for a group
  getAdminPaymentInfo: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const adminMembership = await db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.role, "admin"),
          eq(groupMemberships.status, "approved")
        ),
        with: {
          user: true,
        },
      });

      if (!adminMembership) return null;

      return {
        userId: adminMembership.user.id,
        username: adminMembership.user.username,
        avatar: adminMembership.user.avatar,
        venmoHandle: adminMembership.user.venmoHandle,
        cashappHandle: adminMembership.user.cashappHandle,
        paypalHandle: adminMembership.user.paypalHandle,
      };
    }),

  // Get group ledger: net P&L per member
  getGroupLedger: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const group = await db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      });

      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      const defaultCredits = parseFloat(group.defaultCredits);

      const allCredits = await db.query.memberCredits.findMany({
        where: eq(memberCredits.groupId, input.groupId),
        with: {
          user: true,
        },
      });

      return allCredits
        .map((credit) => {
          const available = parseFloat(credit.availableBalance);
          const allocated = parseFloat(credit.allocatedBalance);
          const total = available + allocated;
          const netPnL = total - defaultCredits;

          return {
            userId: credit.userId,
            username: credit.user.username,
            avatar: credit.user.avatar,
            venmoHandle: credit.user.venmoHandle,
            cashappHandle: credit.user.cashappHandle,
            paypalHandle: credit.user.paypalHandle,
            totalCredits: total.toFixed(2),
            netPnL: netPnL.toFixed(2),
          };
        })
        .sort((a, b) => parseFloat(b.netPnL) - parseFloat(a.netPnL));
    }),

  // Record a payment
  recordPayment: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        toUserId: z.string().uuid(),
        amount: z.number().positive(),
        method: z.string().optional(),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);
      await verifyGroupMembership(input.toUserId, input.groupId);

      if (ctx.user.id === input.toUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot record a payment to yourself",
        });
      }

      const [settlement] = await db
        .insert(settlements)
        .values({
          groupId: input.groupId,
          fromUserId: ctx.user.id,
          toUserId: input.toUserId,
          amount: input.amount.toFixed(2),
          method: input.method || null,
          note: input.note || null,
          status: "pending",
        })
        .returning();

      return settlement;
    }),

  // Confirm a payment (recipient or admin)
  confirmPayment: protectedProcedure
    .input(z.object({ settlementId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const settlement = await db.query.settlements.findFirst({
        where: eq(settlements.id, input.settlementId),
      });

      if (!settlement) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Settlement not found" });
      }

      if (settlement.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Settlement is not pending",
        });
      }

      // Must be recipient or group admin
      const membership = await verifyGroupMembership(ctx.user.id, settlement.groupId);
      const isRecipient = ctx.user.id === settlement.toUserId;
      const isAdmin = membership.role === "admin";

      if (!isRecipient && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the recipient or group admin can confirm",
        });
      }

      const [updated] = await db
        .update(settlements)
        .set({
          status: "confirmed",
          confirmedByUserId: ctx.user.id,
          confirmedAt: new Date(),
        })
        .where(eq(settlements.id, input.settlementId))
        .returning();

      return updated;
    }),

  // Reject a payment (recipient or admin)
  rejectPayment: protectedProcedure
    .input(z.object({ settlementId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const settlement = await db.query.settlements.findFirst({
        where: eq(settlements.id, input.settlementId),
      });

      if (!settlement) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Settlement not found" });
      }

      if (settlement.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Settlement is not pending",
        });
      }

      const membership = await verifyGroupMembership(ctx.user.id, settlement.groupId);
      const isRecipient = ctx.user.id === settlement.toUserId;
      const isAdmin = membership.role === "admin";

      if (!isRecipient && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the recipient or group admin can reject",
        });
      }

      const [updated] = await db
        .update(settlements)
        .set({
          status: "rejected",
          confirmedByUserId: ctx.user.id,
          confirmedAt: new Date(),
        })
        .where(eq(settlements.id, input.settlementId))
        .returning();

      return updated;
    }),

  // Get all settlements for a group
  getGroupSettlements: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const results = await db.query.settlements.findMany({
        where: eq(settlements.groupId, input.groupId),
        orderBy: [desc(settlements.createdAt)],
        with: {
          fromUser: true,
          toUser: true,
          confirmedBy: true,
        },
      });

      return results.map((s) => ({
        id: s.id,
        groupId: s.groupId,
        fromUserId: s.fromUserId,
        fromUsername: s.fromUser.username,
        fromAvatar: s.fromUser.avatar,
        toUserId: s.toUserId,
        toUsername: s.toUser.username,
        toAvatar: s.toUser.avatar,
        amount: s.amount,
        method: s.method,
        note: s.note,
        status: s.status,
        confirmedByUsername: s.confirmedBy?.username || null,
        createdAt: s.createdAt,
        confirmedAt: s.confirmedAt,
      }));
    }),
});
