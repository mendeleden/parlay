"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ticket,
  ChevronRight,
  Loader2,
  TrendingUp,
  Trophy,
  XCircle,
  Clock,
  Filter,
} from "lucide-react";
import { useState } from "react";
import { formatAmericanOdds } from "@/lib/odds";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function BetsPage() {
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const { data: groups, isLoading: groupsLoading } =
    trpc.groups.getMyGroups.useQuery();

  const approvedGroups = groups?.filter((g) => g.status === "approved") || [];

  // Fetch bets for each group
  const betsQueries = trpc.useQueries((t) =>
    approvedGroups.map((group) => t.bets.getByGroup({ groupId: group.id }))
  );

  const isLoading = groupsLoading || betsQueries.some((q) => q.isLoading);

  // Combine all bets from all groups
  const allBets = betsQueries
    .flatMap((q, idx) =>
      (q.data || []).map((bet) => ({
        ...bet,
        groupName: approvedGroups[idx]?.name || "Unknown",
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const filteredBets =
    selectedGroup === "all"
      ? allBets
      : allBets.filter((bet) => bet.groupId === selectedGroup);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "settled":
        return {
          icon: Trophy,
          label: "Settled",
          bg: "bg-emerald-100",
          text: "text-emerald-700",
          gradient: "from-emerald-500 to-green-500",
        };
      case "cancelled":
        return {
          icon: XCircle,
          label: "Cancelled",
          bg: "bg-gray-100",
          text: "text-gray-600",
          gradient: "from-gray-400 to-gray-500",
        };
      default:
        return {
          icon: Clock,
          label: "Open",
          bg: "bg-violet-100",
          text: "text-violet-700",
          gradient: "from-violet-500 to-fuchsia-500",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-gray-500">Loading your bets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            All Bets
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">
            Track and manage bets across all your groups
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-[180px] border-gray-200 focus:ring-violet-500">
              <SelectValue placeholder="Filter by group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {approvedGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Bets list */}
      <AnimatePresence mode="wait">
        {filteredBets.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-3xl p-8 sm:p-12 text-center border border-violet-100"
          >
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mb-6">
              <Ticket className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No bets found
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {selectedGroup === "all"
                ? "Create your first bet in one of your groups to start betting with friends"
                : "No bets in this group yet. Be the first to create one!"}
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              <Link href="/groups">Go to Groups</Link>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-3 sm:gap-4"
          >
            {filteredBets.map((bet) => {
              const statusConfig = getStatusConfig(bet.status);
              const StatusIcon = statusConfig.icon;
              const bestOdds = bet.options?.length
                ? Math.max(...bet.options.map((o: { americanOdds: number }) => o.americanOdds))
                : null;

              return (
                <motion.div key={bet.id} variants={item}>
                  <Link href={`/bets/${bet.id}`}>
                    <div className="group p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          {/* Icon with gradient */}
                          <div
                            className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${statusConfig.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center`}
                          >
                            <Ticket className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                          </div>

                          <div className="min-w-0 flex-1">
                            {/* Group badge */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge
                                variant="outline"
                                className="text-xs border-violet-200 text-violet-600"
                              >
                                {bet.groupName}
                              </Badge>
                              <Badge
                                className={`text-xs ${statusConfig.bg} ${statusConfig.text} hover:${statusConfig.bg}`}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </div>

                            {/* Title */}
                            <h3 className="font-semibold text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                              {bet.title}
                            </h3>

                            {/* Meta info */}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span>by @{bet.createdBy.username}</span>
                              {bet.options?.length > 0 && (
                                <span>{bet.options.length} options</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side - odds preview and arrow */}
                        <div className="flex items-center gap-3 shrink-0">
                          {bestOdds !== null && (
                            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 font-semibold text-sm">
                              <TrendingUp className="h-3.5 w-3.5" />
                              {formatAmericanOdds(bestOdds)}
                            </div>
                          )}
                          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-violet-400 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
