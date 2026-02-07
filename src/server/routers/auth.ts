import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Please enter a valid email"),
        username: z
          .string()
          .min(3, "Username must be at least 3 characters")
          .max(20, "Username must be 20 characters or less")
          .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can only contain letters, numbers, and underscores"
          ),
        password: z.string().min(6, "Password must be at least 6 characters"),
      })
    )
    .mutation(async ({ input }) => {
      // Check if email already exists
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });

      if (existingEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists. Try signing in instead!",
        });
      }

      // Check if username already exists
      const existingUsername = await db.query.users.findFirst({
        where: eq(users.username, input.username.toLowerCase()),
      });

      if (existingUsername) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This username is already taken. Try another one!",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const [newUser] = await db
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          username: input.username.toLowerCase(),
          passwordHash,
        })
        .returning();

      return {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      };
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

  checkEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });

      return {
        exists: !!existing,
        message: existing
          ? "An account with this email exists. Sign in instead!"
          : null,
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
        })
        .where(eq(users.id, ctx.user.id))
        .returning();

      return {
        id: updatedUser.id,
        username: updatedUser.username,
      };
    }),

  getMe: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      hasSetUsername: user.username !== null && !user.username.match(/^[a-z]+[a-z0-9]{4}$/),
    };
  }),
});
