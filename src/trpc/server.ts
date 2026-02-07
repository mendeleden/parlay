import "server-only";

import { createCallerFactory, createTRPCContext } from "@/server/trpc";
import { appRouter } from "@/server/routers";
import { cache } from "react";

// Create server-side caller
const createCaller = createCallerFactory(appRouter);

export const api = cache(async () => {
  const context = await createTRPCContext();
  return createCaller(context);
});
