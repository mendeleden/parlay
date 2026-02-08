"use client";

import { trpc } from "@/trpc/client";
import {
  Users,
  UsersRound,
  Trophy,
  Ticket,
  Layers,
  DollarSign,
  CircleDot,
  Lock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  color = "text-foreground",
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function BetStatusCard({
  status,
  count,
  icon: Icon,
  color,
}: {
  status: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
      <div className={`p-2 rounded-md ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xl font-semibold">{count}</p>
        <p className="text-xs text-muted-foreground capitalize">{status}</p>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { data: stats, isLoading } = trpc.stats.getSummary.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Platform Stats</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-card border border-border rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Platform Stats</h1>
          <p className="text-muted-foreground">Failed to load stats</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Platform Stats</h1>
          <p className="text-muted-foreground mt-1">
            Overview of platform activity
          </p>
        </div>

        {/* Main stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Users"
            value={stats.users}
            icon={Users}
          />
          <StatCard
            title="Groups"
            value={stats.groups}
            icon={UsersRound}
          />
          <StatCard
            title="Memberships"
            value={stats.memberships}
            icon={UsersRound}
            subtitle="Approved members"
          />
          <StatCard
            title="Total Wagered"
            value={formatCurrency(stats.totalWagered)}
            icon={DollarSign}
            color="text-green-500"
          />
        </div>

        {/* Bets section */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Bets</h2>
            <span className="text-2xl font-bold ml-auto">{stats.bets.total}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BetStatusCard
              status="Open"
              count={stats.bets.open}
              icon={CircleDot}
              color="bg-blue-500"
            />
            <BetStatusCard
              status="Locked"
              count={stats.bets.locked}
              icon={Lock}
              color="bg-amber-500"
            />
            <BetStatusCard
              status="Settled"
              count={stats.bets.settled}
              icon={CheckCircle2}
              color="bg-green-500"
            />
            <BetStatusCard
              status="Cancelled"
              count={stats.bets.cancelled}
              icon={XCircle}
              color="bg-red-500"
            />
          </div>
        </div>

        {/* Other stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Total Wagers"
            value={stats.wagers}
            icon={Ticket}
            subtitle="Individual wagers placed"
          />
          <StatCard
            title="Parlays"
            value={stats.parlays}
            icon={Layers}
            subtitle="Parlay bets created"
          />
        </div>
      </div>
    </div>
  );
}
