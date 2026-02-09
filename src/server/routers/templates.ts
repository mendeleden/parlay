import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/db";
import { betTemplates, groupMemberships } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
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

const optionSchema = z.object({
  name: z.string().min(1),
  americanOdds: z.number().int().refine(
    (v) => v >= 100 || v <= -100,
    "Odds must be +100 or higher, or -100 or lower"
  ),
});

export const templatesRouter = router({
  list: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      return db.query.betTemplates.findMany({
        where: eq(betTemplates.groupId, input.groupId),
        orderBy: [desc(betTemplates.createdAt)],
        with: {
          createdBy: true,
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await db.query.betTemplates.findFirst({
        where: eq(betTemplates.id, input.id),
        with: {
          createdBy: true,
        },
      });

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      await verifyGroupMembership(ctx.user.id, template.groupId);

      return template;
    }),

  create: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        name: z.string().min(1).max(100),
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        options: z.array(optionSchema).min(2).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyGroupMembership(ctx.user.id, input.groupId);

      const [template] = await db
        .insert(betTemplates)
        .values({
          groupId: input.groupId,
          createdById: ctx.user.id,
          name: input.name,
          title: input.title,
          description: input.description ?? null,
          options: input.options,
        })
        .returning();

      return template;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.betTemplates.findFirst({
        where: eq(betTemplates.id, input.id),
      });

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      const membership = await verifyGroupMembership(ctx.user.id, template.groupId);

      // Only creator or admin can delete
      if (template.createdById !== ctx.user.id && membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the template creator or a group admin can delete this template",
        });
      }

      await db.delete(betTemplates).where(eq(betTemplates.id, input.id));

      return { success: true };
    }),
});
