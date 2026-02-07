"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trash2,
  CheckCircle,
  Layers,
  Trophy,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { formatAmericanOdds, formatCurrency } from "@/lib/odds";

export default function ParlayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const parlayId = params.id as string;

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveStatus, setResolveStatus] = useState<string>("");

  const utils = trpc.useUtils();

  const { data: parlay, isLoading } = trpc.parlays.getById.useQuery({
    id: parlayId,
  });

  const updateResultMutation = trpc.parlays.updateResult.useMutation({
    onSuccess: () => {
      toast.success("Parlay result updated");
      setResolveOpen(false);
      utils.parlays.getById.invalidate({ id: parlayId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.parlays.delete.useMutation({
    onSuccess: () => {
      toast.success("Parlay deleted");
      router.push("/parlays");
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
      case "push":
        return {
          icon: Clock,
          label: "Push",
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
          <p className="text-gray-500">Loading parlay...</p>
        </div>
      </div>
    );
  }

  if (!parlay) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Layers className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Parlay not found</p>
        <Button onClick={() => router.push("/parlays")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Parlays
        </Button>
      </div>
    );
  }

  const isCreator = parlay.createdById === session?.user?.id;
  const isPending = parlay.result === "pending";
  const statusConfig = getStatusConfig(parlay.result);
  const StatusIcon = statusConfig.icon;

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
          className="shrink-0 mt-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Link href={`/groups/${parlay.groupId}`}>
              <Badge variant="outline" className="text-xs border-violet-200 text-violet-600 hover:bg-violet-50">
                {parlay.group?.name}
              </Badge>
            </Link>
            <Badge className="text-xs bg-violet-100 text-violet-700 hover:bg-violet-100">
              {parlay.legs.length} legs
            </Badge>
            <Badge className={`text-xs ${statusConfig.bg} ${statusConfig.text}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {parlay.name}
          </h1>
          {parlay.description && (
            <p className="text-gray-500 mt-1">{parlay.description}</p>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-medium">Legs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{parlay.legs.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Total Odds</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {parlay.totalOdds ? formatAmericanOdds(parlay.totalOdds) : "N/A"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">Stake</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {parlay.amount ? formatCurrency(parseFloat(parlay.amount)) : "N/A"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-medium">Potential</span>
          </div>
          <p className="text-2xl font-bold text-violet-600">
            {parlay.potentialPayout ? formatCurrency(parseFloat(parlay.potentialPayout)) : "N/A"}
          </p>
        </div>
      </motion.div>

      {/* Actions */}
      {isCreator && isPending && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2"
        >
          <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
                <CheckCircle className="mr-2 h-4 w-4" />
                Resolve Parlay
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resolve Parlay</DialogTitle>
                <DialogDescription>
                  Set the final result for this parlay
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Result</Label>
                  <Select
                    value={resolveStatus}
                    onValueChange={setResolveStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResolveOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    updateResultMutation.mutate({
                      parlayId,
                      result: resolveStatus as "won" | "lost" | "push" | "pending",
                    })
                  }
                  disabled={!resolveStatus || updateResultMutation.isPending}
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500"
                >
                  {updateResultMutation.isPending ? "Updating..." : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this parlay?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate({ parlayId })}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      )}

      {/* Parlay Legs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Parlay Legs</h2>
          <p className="text-sm text-gray-500">
            All {parlay.legs.length} bets in this parlay
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {parlay.legs
            .sort((a, b) => a.order - b.order)
            .map((leg, index) => {
              const legStatusConfig = getStatusConfig(leg.wager.bet.status);

              return (
                <Link
                  key={leg.wagerId}
                  href={`/bets/${leg.wager.bet.id}`}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {leg.wager.bet.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {leg.wager.option.name}
                          </Badge>
                          <span className="text-sm text-emerald-600 font-semibold">
                            {formatAmericanOdds(leg.wager.oddsAtWager)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${legStatusConfig.bg} ${legStatusConfig.text}`}>
                          {legStatusConfig.label}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
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
        className="text-sm text-gray-400 flex flex-wrap gap-4"
      >
        <span>Created by @{parlay.createdBy?.username}</span>
        <span>Created {new Date(parlay.createdAt).toLocaleDateString()}</span>
      </motion.div>
    </div>
  );
}
