import { router, publicProcedure } from "../trpc";
import { db } from "@/db";
import { users, groups, bets, wagers, parlays, groupMemberships } from "@/db/schema";
import { sql, eq, count } from "drizzle-orm";

export const statsRouter = router({
  getSummary: publicProcedure.query(async () => {
    // Get counts in parallel
    const [
      userCount,
      groupCount,
      betsByStatus,
      parlayCount,
      wagerCount,
      totalWagered,
      membershipCount,
    ] = await Promise.all([
      // Total users
      db.select({ count: count() }).from(users),

      // Total groups
      db.select({ count: count() }).from(groups),

      // Bets by status
      db
        .select({
          status: bets.status,
          count: count(),
        })
        .from(bets)
        .groupBy(bets.status),

      // Total parlays
      db.select({ count: count() }).from(parlays),

      // Total wagers
      db.select({ count: count() }).from(wagers),

      // Total amount wagered
      db
        .select({
          total: sql<string>`COALESCE(SUM(${wagers.amount}), 0)`,
        })
        .from(wagers),

      // Total approved memberships
      db
        .select({ count: count() })
        .from(groupMemberships)
        .where(eq(groupMemberships.status, "approved")),
    ]);

    // Transform bets by status into object
    const betStats = {
      open: 0,
      locked: 0,
      settled: 0,
      cancelled: 0,
      total: 0,
    };

    for (const row of betsByStatus) {
      if (row.status) {
        betStats[row.status] = row.count;
        betStats.total += row.count;
      }
    }

    return {
      users: userCount[0]?.count ?? 0,
      groups: groupCount[0]?.count ?? 0,
      memberships: membershipCount[0]?.count ?? 0,
      bets: betStats,
      parlays: parlayCount[0]?.count ?? 0,
      wagers: wagerCount[0]?.count ?? 0,
      totalWagered: parseFloat(totalWagered[0]?.total ?? "0"),
    };
  }),
});
