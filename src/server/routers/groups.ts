import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/db";
import { groups, groupMemberships, users, memberCredits, creditTransactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

// Generate a URL-friendly slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .slice(0, 40); // Limit length
}

// Ensure slug is unique by appending a suffix if needed
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 0;

  while (true) {
    const existing = await db.query.groups.findFirst({
      where: eq(groups.slug, slug),
    });

    if (!existing) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export const groupsRouter = router({
  // Get basic group info by invite code (public - for invite page)
  getPublicByInviteCode: publicProcedure
    .input(z.object({ inviteCode: z.string() }))
    .query(async ({ input }) => {
      // Find group with case-insensitive match
      const allGroups = await db.query.groups.findMany({
        with: {
          createdBy: true,
          memberships: {
            where: eq(groupMemberships.status, "approved"),
          },
        },
      });
      const group = allGroups.find(
        (g) => g.inviteCode.toLowerCase() === input.inviteCode.toLowerCase()
      );

      if (!group) {
        return null;
      }

      return {
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description,
        requiresApproval: group.requiresApproval,
        createdBy: group.createdBy.username,
        memberCount: group.memberships.length,
      };
    }),

  // Create a new group
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        requiresApproval: z.boolean().default(true),
        defaultCredits: z.number().min(0).max(1000000).default(1000),
        allowCreatorWagers: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inviteCode = nanoid(8);
      const baseSlug = generateSlug(input.name);
      const slug = await ensureUniqueSlug(baseSlug || "group");

      const [group] = await db
        .insert(groups)
        .values({
          name: input.name,
          slug,
          description: input.description,
          inviteCode,
          requiresApproval: input.requiresApproval,
          defaultCredits: input.defaultCredits.toFixed(2),
          allowCreatorWagers: input.allowCreatorWagers,
          createdById: ctx.user.id,
        })
        .returning();

      // Add creator as admin member
      await db.insert(groupMemberships).values({
        userId: ctx.user.id,
        groupId: group.id,
        role: "admin",
        status: "approved",
      });

      // Initialize creator's credits
      await db.insert(memberCredits).values({
        userId: ctx.user.id,
        groupId: group.id,
        availableBalance: input.defaultCredits.toFixed(2),
        allocatedBalance: "0",
      });

      // Log the initial credit transaction
      await db.insert(creditTransactions).values({
        userId: ctx.user.id,
        groupId: group.id,
        type: "initial",
        amount: input.defaultCredits.toFixed(2),
        balanceAfter: input.defaultCredits.toFixed(2),
        allocatedAfter: "0",
        note: "Initial credits on group creation",
      });

      return group;
    }),

  // Get all groups the user is a member of
  getMyGroups: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await db.query.groupMemberships.findMany({
      where: eq(groupMemberships.userId, ctx.user.id),
      with: {
        group: {
          with: {
            createdBy: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.group,
      role: m.role,
      status: m.status,
    }));
  }),

  // Get a specific group by ID or slug
  getById: protectedProcedure
    .input(z.object({ id: z.string() })) // Can be UUID or slug
    .query(async ({ ctx, input }) => {
      // Check if it's a UUID or slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id);

      // Find the group first
      let group;
      if (isUuid) {
        group = await db.query.groups.findFirst({
          where: eq(groups.id, input.id),
          with: {
            createdBy: true,
            memberships: {
              with: {
                user: true,
              },
            },
          },
        });
      } else {
        group = await db.query.groups.findFirst({
          where: eq(groups.slug, input.id),
          with: {
            createdBy: true,
            memberships: {
              with: {
                user: true,
              },
            },
          },
        });
      }

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      const membership = await db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, group.id),
          eq(groupMemberships.userId, ctx.user.id),
          eq(groupMemberships.status, "approved")
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this group",
        });
      }

      return group;
    }),

  // Get group by invite code (for invite link page)
  getByInviteCode: protectedProcedure
    .input(z.object({ inviteCode: z.string() }))
    .query(async ({ ctx, input }) => {
      // Find group with case-insensitive match
      const allGroups = await db.query.groups.findMany();
      const group = allGroups.find(
        (g) => g.inviteCode.toLowerCase() === input.inviteCode.toLowerCase()
      );

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code",
        });
      }

      // Check if already a member
      const existingMembership = await db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, group.id),
          eq(groupMemberships.userId, ctx.user.id)
        ),
      });

      return {
        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description,
          requiresApproval: group.requiresApproval,
        },
        membership: existingMembership
          ? {
              status: existingMembership.status,
              role: existingMembership.role,
            }
          : null,
      };
    }),

  // Join a group via invite code
  joinWithInviteCode: protectedProcedure
    .input(z.object({ inviteCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Find group with case-insensitive match
      const allGroups = await db.query.groups.findMany();
      const group = allGroups.find(
        (g) => g.inviteCode.toLowerCase() === input.inviteCode.toLowerCase()
      );

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code",
        });
      }

      // Check if already a member
      const existingMembership = await db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, group.id),
          eq(groupMemberships.userId, ctx.user.id)
        ),
      });

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member or have a pending request",
        });
      }

      const isAutoApproved = !group.requiresApproval;

      const [membership] = await db
        .insert(groupMemberships)
        .values({
          userId: ctx.user.id,
          groupId: group.id,
          role: "member",
          status: isAutoApproved ? "approved" : "pending",
        })
        .returning();

      // If auto-approved, initialize credits immediately
      if (isAutoApproved) {
        const defaultCredits = parseFloat(group.defaultCredits);

        await db.insert(memberCredits).values({
          userId: ctx.user.id,
          groupId: group.id,
          availableBalance: defaultCredits.toFixed(2),
          allocatedBalance: "0",
        });

        await db.insert(creditTransactions).values({
          userId: ctx.user.id,
          groupId: group.id,
          type: "initial",
          amount: defaultCredits.toFixed(2),
          balanceAfter: defaultCredits.toFixed(2),
          allocatedAfter: "0",
          note: "Initial credits on joining group",
        });
      }

      return {
        group,
        membership,
        requiresApproval: group.requiresApproval,
      };
    }),

  // Get pending membership requests (admin only)
  getPendingRequests: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Check if user is admin
      const adminMembership = await db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, ctx.user.id),
          eq(groupMemberships.role, "admin")
        ),
      });

      if (!adminMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can view pending requests",
        });
      }

      const pendingMemberships = await db.query.groupMemberships.findMany({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.status, "pending")
        ),
        with: {
          user: true,
        },
      });

      return pendingMemberships;
    }),

  // Approve or reject membership request (admin only)
  handleMembershipRequest: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        userId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const adminMembership = await db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, ctx.user.id),
          eq(groupMemberships.role, "admin")
        ),
      });

      if (!adminMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can handle membership requests",
        });
      }

      const newStatus = input.action === "approve" ? "approved" : "rejected";

      await db
        .update(groupMemberships)
        .set({ status: newStatus })
        .where(
          and(
            eq(groupMemberships.groupId, input.groupId),
            eq(groupMemberships.userId, input.userId)
          )
        );

      // If approving, initialize member credits
      if (input.action === "approve") {
        const group = await db.query.groups.findFirst({
          where: eq(groups.id, input.groupId),
        });

        if (group) {
          const defaultCredits = parseFloat(group.defaultCredits);

          // Check if credits already exist (edge case)
          const existingCredits = await db.query.memberCredits.findFirst({
            where: and(
              eq(memberCredits.userId, input.userId),
              eq(memberCredits.groupId, input.groupId)
            ),
          });

          if (!existingCredits) {
            await db.insert(memberCredits).values({
              userId: input.userId,
              groupId: input.groupId,
              availableBalance: defaultCredits.toFixed(2),
              allocatedBalance: "0",
            });

            await db.insert(creditTransactions).values({
              userId: input.userId,
              groupId: input.groupId,
              type: "initial",
              amount: defaultCredits.toFixed(2),
              balanceAfter: defaultCredits.toFixed(2),
              allocatedAfter: "0",
              note: "Initial credits on membership approval",
            });
          }
        }
      }

      return { success: true };
    }),

  // Regenerate invite code (admin only)
  regenerateInviteCode: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const adminMembership = await db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, ctx.user.id),
          eq(groupMemberships.role, "admin")
        ),
      });

      if (!adminMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can regenerate invite codes",
        });
      }

      const newCode = nanoid(8);

      const [updatedGroup] = await db
        .update(groups)
        .set({ inviteCode: newCode })
        .where(eq(groups.id, input.groupId))
        .returning();

      return updatedGroup;
    }),

  // Get group members
  getMembers: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Check if user is a member
      const membership = await db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, ctx.user.id),
          eq(groupMemberships.status, "approved")
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this group",
        });
      }

      const members = await db.query.groupMemberships.findMany({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.status, "approved")
        ),
        with: {
          user: true,
        },
      });

      return members;
    }),

  // Update group settings (admin only)
  updateSettings: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        allowCreatorWagers: z.boolean().optional(),
        requiresApproval: z.boolean().optional(),
        defaultCredits: z.number().min(0).max(1000000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const adminMembership = await db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, ctx.user.id),
          eq(groupMemberships.role, "admin")
        ),
      });

      if (!adminMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update group settings",
        });
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.allowCreatorWagers !== undefined) {
        updates.allowCreatorWagers = input.allowCreatorWagers;
      }
      if (input.requiresApproval !== undefined) {
        updates.requiresApproval = input.requiresApproval;
      }
      if (input.defaultCredits !== undefined) {
        updates.defaultCredits = input.defaultCredits.toFixed(2);
      }

      const [updatedGroup] = await db
        .update(groups)
        .set(updates)
        .where(eq(groups.id, input.groupId))
        .returning();

      return updatedGroup;
    }),
});
