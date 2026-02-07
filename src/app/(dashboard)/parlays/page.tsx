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
  Layers,
  ChevronRight,
  Loader2,
  Trophy,
  XCircle,
  Clock,
  Filter,
  Zap,
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

export default function ParlaysPage() {
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const { data: groups, isLoading: groupsLoading } =
    trpc.groups.getMyGroups.useQuery();

  const approvedGroups = groups?.filter((g) => g.status === "approved") || [];

  // Fetch parlays for each group
  const parlaysQueries = trpc.useQueries((t) =>
    approvedGroups.map((group) =>
      t.parlays.getByGroup({ groupId: group.id })
    )
  );

  const isLoading = groupsLoading || parlaysQueries.some((q) => q.isLoading);

  // Combine all parlays from all groups
  const allParlays = parlaysQueries
    .flatMap((q, idx) =>
      (q.data || []).map((parlay) => ({
        ...parlay,
        groupName: approvedGroups[idx]?.name || "Unknown",
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const filteredParlays =
    selectedGroup === "all"
      ? allParlays
      : allParlays.filter((parlay) => parlay.groupId === selectedGroup);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "won":
        return {
          icon: Trophy,
          label: "Won",
          bg: "bg-emerald-100",
          text: "text-emerald-700",
          gradient: "from-emerald-500 to-green-500",
        };
      case "lost":
        return {
          icon: XCircle,
          label: "Lost",
          bg: "bg-red-100",
          text: "text-red-700",
          gradient: "from-red-500 to-rose-500",
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
          label: "Pending",
          bg: "bg-amber-100",
          text: "text-amber-700",
          gradient: "from-amber-500 to-orange-500",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-gray-500">Loading your parlays...</p>
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
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            Parlays
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">
            Stack bets for massive payouts
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-[180px] border-gray-200 focus:ring-amber-500">
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

      {/* Parlays list */}
      <AnimatePresence mode="wait">
        {filteredParlays.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 sm:p-12 text-center border border-amber-100"
          >
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6">
              <Layers className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No parlays yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {selectedGroup === "all"
                ? "Build your first parlay by combining multiple bets for bigger payouts"
                : "No parlays in this group yet. Be the first to create one!"}
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
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
            {filteredParlays.map((parlay) => {
              const statusConfig = getStatusConfig(parlay.result);
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div key={parlay.id} variants={item}>
                  <Link href={`/parlays/${parlay.id}`}>
                    <div className="group p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          {/* Icon with gradient */}
                          <div
                            className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${statusConfig.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center`}
                          >
                            <Layers className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                          </div>

                          <div className="min-w-0 flex-1">
                            {/* Badges */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge
                                variant="outline"
                                className="text-xs border-amber-200 text-amber-600"
                              >
                                {parlay.groupName}
                              </Badge>
                              <Badge
                                className="text-xs bg-violet-100 text-violet-700 hover:bg-violet-100"
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                {parlay.legs.length} legs
                              </Badge>
                              <Badge
                                className={`text-xs ${statusConfig.bg} ${statusConfig.text} hover:${statusConfig.bg}`}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </div>

                            {/* Title */}
                            <h3 className="font-semibold text-gray-900 truncate group-hover:text-amber-600 transition-colors">
                              {parlay.name}
                            </h3>

                            {/* Meta info */}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span>by @{parlay.createdBy.username}</span>
                              {parlay.amount && (
                                <span>${parlay.amount} stake</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side - odds and arrow */}
                        <div className="flex items-center gap-3 shrink-0">
                          {parlay.totalOdds && (
                            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 font-bold text-sm">
                              {formatAmericanOdds(parlay.totalOdds)}
                            </div>
                          )}
                          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-amber-400 transition-colors" />
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
