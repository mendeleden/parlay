import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  uuid,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const betStatusEnum = pgEnum("bet_status", [
  "open",
  "locked",
  "settled",
  "cancelled",
]);

export const betResultEnum = pgEnum("bet_result", [
  "pending",
  "won",
  "lost",
  "push",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "pending",
  "approved",
  "rejected",
]);

export const memberRoleEnum = pgEnum("member_role", ["admin", "member"]);

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "initial",
  "admin_adjustment",
  "wager_placed",
  "wager_cancelled",
  "wager_won",
  "wager_lost",
  "bet_cancelled",
  "parlay_placed",
  "parlay_cancelled",
  "parlay_won",
  "parlay_lost",
]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Groups table
export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  inviteCode: text("invite_code").notNull().unique(),
  requiresApproval: boolean("requires_approval").default(true).notNull(),
  defaultCredits: decimal("default_credits", { precision: 10, scale: 2 })
    .default("1000")
    .notNull(),
  allowCreatorWagers: boolean("allow_creator_wagers").default(true).notNull(),
  createdById: uuid("created_by_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Group Memberships table
export const groupMemberships = pgTable(
  "group_memberships",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    role: memberRoleEnum("role").default("member").notNull(),
    status: membershipStatusEnum("status").default("pending").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.groupId] }),
  })
);

// Bets table - the main bet/event
export const bets = pgTable("bets", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .references(() => groups.id, { onDelete: "cascade" })
    .notNull(),
  createdById: uuid("created_by_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: betStatusEnum("status").default("open").notNull(),
  eventDate: timestamp("event_date"),
  locksAt: timestamp("locks_at"), // When betting closes
  settledAt: timestamp("settled_at"),
  winningOptionId: uuid("winning_option_id"), // Which option won
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bet Options - the choices users can bet on (Over/Under, Team A/Team B, etc.)
export const betOptions = pgTable("bet_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  betId: uuid("bet_id")
    .references(() => bets.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(), // e.g., "Over 220.5", "Chiefs -7", "Yes"
  description: text("description"),
  americanOdds: integer("american_odds").notNull(), // +150, -220, etc.
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Wagers - individual user bets on options
export const wagers = pgTable("wagers", {
  id: uuid("id").defaultRandom().primaryKey(),
  betId: uuid("bet_id")
    .references(() => bets.id, { onDelete: "cascade" })
    .notNull(),
  optionId: uuid("option_id")
    .references(() => betOptions.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Stake
  oddsAtWager: integer("odds_at_wager").notNull(), // Odds locked in at time of wager
  potentialPayout: decimal("potential_payout", { precision: 10, scale: 2 }).notNull(),
  result: betResultEnum("result").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Parlays table - combined bets with multiplied odds
export const parlays = pgTable("parlays", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .references(() => groups.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Total stake
  combinedDecimalOdds: decimal("combined_decimal_odds", { precision: 12, scale: 6 }).notNull(),
  potentialPayout: decimal("potential_payout", { precision: 10, scale: 2 }).notNull(),
  result: betResultEnum("result").default("pending").notNull(),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Parlay Legs - individual picks in a parlay
export const parlayLegs = pgTable(
  "parlay_legs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parlayId: uuid("parlay_id")
      .references(() => parlays.id, { onDelete: "cascade" })
      .notNull(),
    betId: uuid("bet_id")
      .references(() => bets.id, { onDelete: "cascade" })
      .notNull(),
    optionId: uuid("option_id")
      .references(() => betOptions.id, { onDelete: "cascade" })
      .notNull(),
    oddsAtPlacement: integer("odds_at_placement").notNull(), // Locked-in odds
    result: betResultEnum("result").default("pending").notNull(),
  }
);

// Member Credits - tracks available and allocated credits per user per group
export const memberCredits = pgTable(
  "member_credits",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    availableBalance: decimal("available_balance", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    allocatedBalance: decimal("allocated_balance", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.groupId] }),
  })
);

// Credit Transactions - audit log for all credit changes
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  groupId: uuid("group_id")
    .references(() => groups.id)
    .notNull(),
  type: creditTransactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  allocatedAfter: decimal("allocated_after", { precision: 10, scale: 2 }).notNull(),
  wagerId: uuid("wager_id").references(() => wagers.id, { onDelete: "set null" }),
  betId: uuid("bet_id").references(() => bets.id, { onDelete: "set null" }),
  parlayId: uuid("parlay_id").references(() => parlays.id, { onDelete: "set null" }),
  adjustedByUserId: uuid("adjusted_by_user_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdGroups: many(groups),
  memberships: many(groupMemberships),
  createdBets: many(bets),
  wagers: many(wagers),
  createdParlays: many(parlays),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [groups.createdById],
    references: [users.id],
  }),
  memberships: many(groupMemberships),
  bets: many(bets),
  parlays: many(parlays),
}));

export const groupMembershipsRelations = relations(
  groupMemberships,
  ({ one }) => ({
    user: one(users, {
      fields: [groupMemberships.userId],
      references: [users.id],
    }),
    group: one(groups, {
      fields: [groupMemberships.groupId],
      references: [groups.id],
    }),
  })
);

export const betsRelations = relations(bets, ({ one, many }) => ({
  group: one(groups, {
    fields: [bets.groupId],
    references: [groups.id],
  }),
  createdBy: one(users, {
    fields: [bets.createdById],
    references: [users.id],
  }),
  options: many(betOptions),
  wagers: many(wagers),
  winningOption: one(betOptions, {
    fields: [bets.winningOptionId],
    references: [betOptions.id],
  }),
}));

export const betOptionsRelations = relations(betOptions, ({ one, many }) => ({
  bet: one(bets, {
    fields: [betOptions.betId],
    references: [bets.id],
  }),
  wagers: many(wagers),
}));

export const wagersRelations = relations(wagers, ({ one }) => ({
  bet: one(bets, {
    fields: [wagers.betId],
    references: [bets.id],
  }),
  option: one(betOptions, {
    fields: [wagers.optionId],
    references: [betOptions.id],
  }),
  user: one(users, {
    fields: [wagers.userId],
    references: [users.id],
  }),
}));

export const parlaysRelations = relations(parlays, ({ one, many }) => ({
  group: one(groups, {
    fields: [parlays.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [parlays.userId],
    references: [users.id],
  }),
  legs: many(parlayLegs),
}));

export const parlayLegsRelations = relations(parlayLegs, ({ one }) => ({
  parlay: one(parlays, {
    fields: [parlayLegs.parlayId],
    references: [parlays.id],
  }),
  bet: one(bets, {
    fields: [parlayLegs.betId],
    references: [bets.id],
  }),
  option: one(betOptions, {
    fields: [parlayLegs.optionId],
    references: [betOptions.id],
  }),
}));

export const memberCreditsRelations = relations(memberCredits, ({ one }) => ({
  user: one(users, {
    fields: [memberCredits.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [memberCredits.groupId],
    references: [groups.id],
  }),
}));

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [creditTransactions.userId],
      references: [users.id],
    }),
    group: one(groups, {
      fields: [creditTransactions.groupId],
      references: [groups.id],
    }),
    wager: one(wagers, {
      fields: [creditTransactions.wagerId],
      references: [wagers.id],
    }),
    bet: one(bets, {
      fields: [creditTransactions.betId],
      references: [bets.id],
    }),
    parlay: one(parlays, {
      fields: [creditTransactions.parlayId],
      references: [parlays.id],
    }),
    adjustedBy: one(users, {
      fields: [creditTransactions.adjustedByUserId],
      references: [users.id],
    }),
  })
);
