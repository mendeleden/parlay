import { router } from "../trpc";
import { authRouter } from "./auth";
import { groupsRouter } from "./groups";
import { betsRouter } from "./bets";
import { parlaysRouter } from "./parlays";
import { creditsRouter } from "./credits";

export const appRouter = router({
  auth: authRouter,
  groups: groupsRouter,
  bets: betsRouter,
  parlays: parlaysRouter,
  credits: creditsRouter,
});

export type AppRouter = typeof appRouter;
