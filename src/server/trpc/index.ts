import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
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
