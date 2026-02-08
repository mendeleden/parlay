import { initTRPC, TRPCError } from "@trpc/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { cache } from "react";

export const createTRPCContext = cache(async () => {
  const { userId: clerkId } = await auth();

  let user = null;
  if (clerkId) {
    // Look up user by clerkId
    user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    // Auto-create user if they exist in Clerk but not in our DB
    if (!user) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
        const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        let username = baseUsername.slice(0, 15);

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
        user = newUser;
      }
    }
  }

  return {
    db,
    clerkId,
    user,
  };
});

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.clerkId || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      clerkId: ctx.clerkId,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
