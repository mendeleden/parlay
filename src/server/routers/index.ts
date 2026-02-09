import { router } from "../trpc";
import { authRouter } from "./auth";
import { groupsRouter } from "./groups";
import { betsRouter } from "./bets";
import { parlaysRouter } from "./parlays";
import { creditsRouter } from "./credits";
import { marketsRouter } from "./markets";
import { statsRouter } from "./stats";
import { notificationsRouter } from "./notifications";

export const appRouter = router({
  auth: authRouter,
  groups: groupsRouter,
  bets: betsRouter,
  parlays: parlaysRouter,
  credits: creditsRouter,
  markets: marketsRouter,
  stats: statsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
