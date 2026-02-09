"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/odds";

interface Wager {
  id: string;
  userId: string;
  optionId: string;
  amount: string;
  potentialPayout: string;
  result: string;
  user?: {
    id: string;
    username: string | null;
    avatar: string | null;
  } | null;
}

interface BetBreakdownProps {
  wagers: Wager[];
  winningOptionId: string | null;
}

export function BetBreakdown({ wagers, winningOptionId }: BetBreakdownProps) {
  if (!wagers || wagers.length === 0) return null;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Dedupe by user: aggregate wagers per user
  const userResults = new Map<
    string,
    { username: string | null; avatar: string | null; net: number }
  >();

  for (const w of wagers) {
    const userId = w.userId;
    const amount = parseFloat(w.amount);
    const payout = parseFloat(w.potentialPayout);
    const won = w.result === "won";
    const lost = w.result === "lost";
    const net = won ? payout - amount : lost ? -amount : 0;

    const existing = userResults.get(userId);
    if (existing) {
      existing.net += net;
    } else {
      userResults.set(userId, {
        username: w.user?.username || null,
        avatar: w.user?.avatar || null,
        net,
      });
    }
  }

  const sortedResults = Array.from(userResults.entries())
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.net - a.net);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Results Breakdown
      </h3>
      <div className="space-y-2.5">
        {sortedResults.map((r) => (
          <div
            key={r.userId}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={r.avatar || undefined} />
                <AvatarFallback className="text-xs bg-theme-gradient-br text-white">
                  {getInitials(r.username)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground truncate">
                @{r.username}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {r.net > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">
                    Won {formatCurrency(r.net)}
                  </span>
                </>
              ) : r.net < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-600">
                    Lost {formatCurrency(Math.abs(r.net))}
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">
                  Push
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
