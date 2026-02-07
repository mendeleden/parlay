"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Award, Coins, Lock, ChevronDown, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/odds";

interface MemberCredit {
  userId: string;
  username: string;
  avatar: string | null;
  availableBalance: string;
  allocatedBalance: string;
  totalBalance: string;
}

interface CreditLeaderboardProps {
  credits: MemberCredit[];
  currentUserId?: string;
  isAdmin?: boolean;
  onAdjustCredits?: (userId: string, username: string) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return (
        <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-gray-400">
          {rank}
        </span>
      );
  }
}

function getInitials(name: string | null | undefined) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CreditLeaderboard({
  credits,
  currentUserId,
  isAdmin = false,
  onAdjustCredits,
}: CreditLeaderboardProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  if (credits.length === 0) {
    return (
      <div className="bg-gray-50 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-theme-gradient-br rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Coins className="h-8 w-8 text-white" />
        </div>
        <p className="text-gray-600 font-medium">No members yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Invite members to start tracking credits
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-2"
    >
      {credits.map((credit, index) => {
        const rank = index + 1;
        const isCurrentUser = credit.userId === currentUserId;
        const isExpanded = expandedUserId === credit.userId;
        const available = parseFloat(credit.availableBalance);
        const allocated = parseFloat(credit.allocatedBalance);
        const total = parseFloat(credit.totalBalance);

        return (
          <motion.div
            key={credit.userId}
            variants={item}
            className={`
              bg-white rounded-xl border overflow-hidden transition-all
              ${isCurrentUser ? "border-theme-primary-200 bg-theme-primary-50/30" : "border-gray-100"}
              ${rank <= 3 ? "shadow-sm" : ""}
            `}
          >
            {/* Main Row - Compact */}
            <div
              className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50/50"
              onClick={() => setExpandedUserId(isExpanded ? null : credit.userId)}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 flex justify-center shrink-0">
                  {getRankIcon(rank)}
                </div>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={credit.avatar || undefined} />
                  <AvatarFallback className="bg-theme-gradient-br text-white text-xs font-medium">
                    {getInitials(credit.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      @{credit.username}
                    </p>
                    {isCurrentUser && (
                      <Badge className="bg-theme-badge text-xs py-0 px-1.5">
                        You
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p
                    className={`text-base font-bold ${
                      rank === 1
                        ? "text-yellow-600"
                        : rank === 2
                          ? "text-gray-600"
                          : rank === 3
                            ? "text-amber-600"
                            : "text-gray-900"
                    }`}
                  >
                    {formatCurrency(total)}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                    {/* Credit Breakdown */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-green-50 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Coins className="h-3 w-3 text-green-600" />
                          <span className="text-[10px] uppercase tracking-wide text-green-700 font-medium">Available</span>
                        </div>
                        <p className="text-sm font-bold text-green-700">
                          {formatCurrency(available)}
                        </p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Lock className="h-3 w-3 text-yellow-600" />
                          <span className="text-[10px] uppercase tracking-wide text-yellow-700 font-medium">In Bets</span>
                        </div>
                        <p className="text-sm font-bold text-yellow-700">
                          {formatCurrency(allocated)}
                        </p>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Wallet className="h-3 w-3 text-gray-600" />
                          <span className="text-[10px] uppercase tracking-wide text-gray-600 font-medium">Total</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">
                          {formatCurrency(total)}
                        </p>
                      </div>
                    </div>

                    {/* Admin Action */}
                    {isAdmin && onAdjustCredits && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdjustCredits(credit.userId, credit.username);
                        }}
                        className="w-full text-theme-primary border-theme-primary-200 hover:bg-theme-primary-50"
                      >
                        Adjust Credits
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
