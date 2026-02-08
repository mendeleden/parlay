import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export const authRouter = router({
  /**
   * Sync Clerk user to our database
   * Called after sign-in/sign-up to ensure user exists in DB
   */
  syncUser: publicProcedure.mutation(async () => {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Clerk user not found",
      });
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (existingUser) {
      // Update email if changed
      if (existingUser.email !== clerkUser.emailAddresses[0]?.emailAddress) {
        await db
          .update(users)
          .set({
            email: clerkUser.emailAddresses[0]?.emailAddress ?? existingUser.email,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      }
      return { id: existingUser.id, isNew: false };
    }

    // Create new user
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No email address found",
      });
    }

    // Generate a temporary username from email
    const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    let username = baseUsername.slice(0, 15);

    // Check if username exists and add random suffix if needed
    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUsername) {
      username = `${username.slice(0, 10)}${Math.random().toString(36).slice(2, 7)}`;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        clerkId,
        email,
        username,
        avatar: clerkUser.imageUrl,
      })
      .returning();

    return { id: newUser.id, isNew: true };
  }),

  checkUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      if (input.username.length < 3) {
        return { available: false, message: "Too short" };
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.username, input.username.toLowerCase()),
      });

      return {
        available: !existing,
        message: existing ? "Username taken" : "Available",
      };
    }),

  updateUsername: protectedProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3, "Username must be at least 3 characters")
          .max(20, "Username must be 20 characters or less")
          .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can only contain letters, numbers, and underscores"
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if username already exists (and isn't the current user's)
      const existingUsername = await db.query.users.findFirst({
        where: eq(users.username, input.username.toLowerCase()),
      });

      if (existingUsername && existingUsername.id !== ctx.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This username is already taken. Try another one!",
        });
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          username: input.username.toLowerCase(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id))
        .returning();

      return {
        id: updatedUser.id,
        username: updatedUser.username,
      };
    }),

  getMe: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      username: ctx.user.username,
      hasSetUsername: ctx.user.username !== null && !ctx.user.username.match(/^[a-z]+[a-z0-9]{4}$/),
    };
  }),
});
