"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Layers,
  Trophy,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Loader2,
  ChevronRight,
  X,
  CheckCircle,
} from "lucide-react";
import { formatAmericanOdds } from "@/lib/odds";

export default function ParlayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const parlayId = params.id as string;

  const utils = trpc.useUtils();

  const { data: parlay, isLoading } = trpc.parlays.getById.useQuery({
    id: parlayId,
  });

  const cancelMutation = trpc.parlays.cancel.useMutation({
    onSuccess: () => {
      toast.success("Parlay cancelled and credits refunded!");
      router.push(`/groups/${parlay?.group?.slug || parlay?.groupId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getStatusConfig = (result: string) => {
    switch (result) {
      case "won":
        return {
          icon: Trophy,
          label: "Won",
          bg: "bg-emerald-100",
          text: "text-emerald-700",
        };
      case "lost":
        return {
          icon: XCircle,
          label: "Lost",
          bg: "bg-red-100",
          text: "text-red-700",
        };
      case "open":
        return {
          icon: Clock,
          label: "Open",
          bg: "bg-green-100",
          text: "text-green-700",
        };
      case "locked":
        return {
          icon: Clock,
          label: "Locked",
          bg: "bg-yellow-100",
          text: "text-yellow-700",
        };
      case "settled":
        return {
          icon: CheckCircle,
          label: "Settled",
          bg: "bg-blue-100",
          text: "text-blue-700",
        };
      default:
        return {
          icon: Clock,
          label: "Pending",
          bg: "bg-amber-100",
          text: "text-amber-700",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-theme-primary" />
          <p className="text-muted-foreground">Loading parlay...</p>
        </div>
      </div>
    );
  }

  if (!parlay) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Layers className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Parlay not found</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const isOwner = parlay.userId === user?.id;
  const isPending = parlay.result === "pending";
  const statusConfig = getStatusConfig(parlay.result);
  const StatusIcon = statusConfig.icon;

  // Calculate combined odds display
  const decimalOdds = parseFloat(parlay.combinedDecimalOdds);
  const americanOdds = decimalOdds >= 2
    ? Math.round((decimalOdds - 1) * 100)
    : Math.round(-100 / (decimalOdds - 1));

  // Check if parlay can be cancelled (all bets still open)
  const canCancel =
    isPending &&
    parlay.legs?.every((leg) => leg.bet?.status === "open");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0 mt-1 text-theme-primary hover:bg-theme-primary-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Link href={`/groups/${parlay.group?.slug || parlay.groupId}`}>
              <Badge variant="outline" className="text-xs border-theme-primary-200 text-theme-primary hover:bg-theme-primary-50">
                {parlay.group?.name || "Group"}
              </Badge>
            </Link>
            <Badge className="text-xs bg-theme-primary-100 text-theme-primary">
              {parlay.legs?.length || 0} legs
            </Badge>
            <Badge className={`text-xs ${statusConfig.bg} ${statusConfig.text}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Parlay Details
          </h1>
          <p className="text-muted-foreground mt-1">
            Placed by @{parlay.user?.username}
          </p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-medium">Legs</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{parlay.legs?.length || 0}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Combined Odds</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {formatAmericanOdds(americanOdds)}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">Stake</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ${parseFloat(parlay.amount).toFixed(2)}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-medium">To Win</span>
          </div>
          <p className="text-2xl font-bold text-theme-primary">
            ${parseFloat(parlay.potentialPayout).toFixed(2)}
          </p>
        </div>
      </motion.div>

      {/* Cancel Action */}
      {isOwner && canCancel && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm("Cancel this parlay and get your credits back?")) {
                cancelMutation.mutate({ parlayId });
              }
            }}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            Cancel Parlay
          </Button>
        </motion.div>
      )}

      {/* Parlay Legs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl border border-border overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Parlay Legs</h2>
          <p className="text-sm text-muted-foreground">
            All {parlay.legs?.length || 0} picks in this parlay
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {parlay.legs?.map((leg, index) => {
            const legResult = leg.result || "pending";
            const legStatusConfig = getStatusConfig(leg.bet?.status || "pending");
            const legResultConfig = getStatusConfig(legResult);

            return (
              <Link
                key={leg.id}
                href={`/bets/${leg.betId}`}
                className="block hover:bg-muted transition-colors"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                      legResult === "won"
                        ? "bg-emerald-100 text-emerald-700"
                        : legResult === "lost"
                        ? "bg-red-100 text-red-700"
                        : "bg-theme-primary-100 text-theme-primary"
                    }`}>
                      {legResult === "won" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : legResult === "lost" ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-foreground truncate ${
                        legResult === "lost" ? "line-through opacity-60" : ""
                      }`}>
                        {leg.bet?.title || "Bet"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${
                          legResult === "won"
                            ? "border-emerald-200 text-emerald-700"
                            : legResult === "lost"
                            ? "border-red-200 text-red-700 line-through"
                            : ""
                        }`}>
                          {leg.option?.name || "Option"}
                        </Badge>
                        <span className="text-sm text-emerald-600 font-semibold">
                          {formatAmericanOdds(leg.oddsAtPlacement)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${legStatusConfig.bg} ${legStatusConfig.text}`}>
                        {legStatusConfig.label}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Meta Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-muted-foreground flex flex-wrap gap-4"
      >
        <span>Placed by @{parlay.user?.username}</span>
        <span>Created {new Date(parlay.createdAt).toLocaleDateString()}</span>
        {parlay.settledAt && (
          <span>Settled {new Date(parlay.settledAt).toLocaleDateString()}</span>
        )}
      </motion.div>
    </div>
  );
}
