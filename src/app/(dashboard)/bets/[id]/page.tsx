"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Clock,
  Lock,
  CheckCircle,
  XCircle,
  Trash2,
  Trophy,
  DollarSign,
  Users,
  Coins,
  AlertCircle,
} from "lucide-react";
import { formatAmericanOdds, calculatePayout, formatCurrency } from "@/lib/odds";
import { CreditDisplay } from "@/components/credits";

export default function BetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const betId = params.id as string;

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [wagerAmount, setWagerAmount] = useState("");
  const [placeWagerOpen, setPlaceWagerOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [winningOptionId, setWinningOptionId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: bet, isLoading } = trpc.bets.getById.useQuery({ id: betId });

  // Query credits after we have the bet (need groupId)
  const { data: myCredits } = trpc.credits.getMyCredits.useQuery(
    { groupId: bet?.groupId! },
    { enabled: !!bet?.groupId }
  );

  const placeWagerMutation = trpc.bets.placeWager.useMutation({
    onSuccess: () => {
      toast.success("Wager placed!");
      setPlaceWagerOpen(false);
      setSelectedOption(null);
      setWagerAmount("");
      utils.bets.getById.invalidate({ id: betId });
      if (bet?.groupId) {
        utils.credits.getMyCredits.invalidate({ groupId: bet.groupId });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelWagerMutation = trpc.bets.cancelWager.useMutation({
    onSuccess: () => {
      toast.success("Wager cancelled");
      utils.bets.getById.invalidate({ id: betId });
      if (bet?.groupId) {
        utils.credits.getMyCredits.invalidate({ groupId: bet.groupId });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const lockMutation = trpc.bets.lock.useMutation({
    onSuccess: () => {
      toast.success("Bet locked - no more wagers accepted");
      utils.bets.getById.invalidate({ id: betId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const settleMutation = trpc.bets.settle.useMutation({
    onSuccess: () => {
      toast.success("Bet settled!");
      setSettleOpen(false);
      utils.bets.getById.invalidate({ id: betId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelBetMutation = trpc.bets.cancel.useMutation({
    onSuccess: () => {
      toast.success("Bet cancelled");
      utils.bets.getById.invalidate({ id: betId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.bets.delete.useMutation({
    onSuccess: () => {
      toast.success("Bet deleted");
      router.push(`/groups/${bet?.groupId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "open":
        return { icon: Clock, color: "text-green-600", bg: "bg-green-100", label: "Open for betting" };
      case "locked":
        return { icon: Lock, color: "text-yellow-600", bg: "bg-yellow-100", label: "Locked" };
      case "settled":
        return { icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-100", label: "Settled" };
      case "cancelled":
        return { icon: XCircle, color: "text-gray-600", bg: "bg-muted", label: "Cancelled" };
      default:
        return { icon: Clock, color: "text-gray-600", bg: "bg-muted", label: status };
    }
  };

  const handlePlaceWager = () => {
    if (!selectedOption || !wagerAmount) {
      toast.error("Please enter an amount");
      return;
    }
    const amount = parseFloat(wagerAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    placeWagerMutation.mutate({
      optionId: selectedOption,
      amount,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-theme-primary" />
          <p className="text-muted-foreground">Loading bet...</p>
        </div>
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground mb-4">Bet not found</p>
        <Button
          onClick={() => router.push("/bets")}
          className="bg-theme-gradient"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bets
        </Button>
      </div>
    );
  }

  const isCreator = bet.createdById === user?.id;
  const userWager = bet.wagers?.find((w) => w.userId === user?.id);
  const isOpen = bet.status === "open";
  const isSettled = bet.status === "settled";
  const statusInfo = getStatusInfo(bet.status);
  const StatusIcon = statusInfo.icon;

  // Calculate selected option payout
  const selectedOptionData = bet.options?.find((o) => o.id === selectedOption);
  const potentialPayout = selectedOptionData && wagerAmount
    ? calculatePayout(selectedOptionData.americanOdds, parseFloat(wagerAmount) || 0)
    : 0;

  // Credit validation
  const availableCredits = parseFloat(myCredits?.availableBalance || "0");
  const wagerAmountNum = parseFloat(wagerAmount) || 0;
  const insufficientCredits = wagerAmountNum > availableCredits;

  return (
    <div className="space-y-6 pb-8">
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
          className="shrink-0 text-theme-primary hover:bg-theme-primary-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <Link
            href={`/groups/${bet.groupId}`}
            className="text-sm text-theme-primary hover:underline mb-1 inline-block"
          >
            {bet.group?.name}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {bet.title}
          </h1>
          {bet.description && (
            <p className="text-muted-foreground mt-1">{bet.description}</p>
          )}
        </div>
      </motion.div>

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`${statusInfo.bg} rounded-2xl p-4 flex items-center gap-3`}
      >
        <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
        <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
        {isSettled && bet.winningOptionId && (
          <span className="ml-auto flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Winner: {bet.options?.find((o) => o.id === bet.winningOptionId)?.name}
          </span>
        )}
      </motion.div>

      {/* User's Wager Card */}
      {userWager && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-theme-gradient-light rounded-2xl p-5 border border-theme-primary-100"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Wager</h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground text-lg">
                {bet.options?.find((o) => o.id === userWager.optionId)?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatAmericanOdds(userWager.oddsAtWager)} odds
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(parseFloat(userWager.amount))}
                </p>
                <p className="text-xs text-muted-foreground">Wagered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(parseFloat(userWager.potentialPayout))}
                </p>
                <p className="text-xs text-muted-foreground">To Win</p>
              </div>
            </div>
          </div>
          {isOpen && (
            <div className="mt-4 pt-4 border-t border-theme-primary-200">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                    Cancel Wager
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel your wager?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You can place a new wager afterward if the bet is still open.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Wager</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelWagerMutation.mutate({ wagerId: userWager.id })}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Cancel Wager
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </motion.div>
      )}

      {/* Betting Options */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Betting Options</h3>
        <div className="space-y-3">
          {bet.options?.map((option) => {
            const optionWagers = bet.wagers?.filter((w) => w.optionId === option.id) || [];
            const isWinner = bet.winningOptionId === option.id;
            return (
              <div
                key={option.id}
                className={`
                  rounded-2xl border p-4 transition-all
                  ${isWinner ? "bg-green-50 border-green-200" : "bg-card border-border"}
                  ${isOpen && !userWager ? "hover:border-theme-primary-300 hover:shadow-md cursor-pointer" : ""}
                `}
                onClick={() => {
                  if (isOpen && !userWager) {
                    setSelectedOption(option.id);
                    setPlaceWagerOpen(true);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground">{option.name}</h4>
                      {isWinner && (
                        <Badge className="bg-green-500">
                          <Trophy className="h-3 w-3 mr-1" />
                          Winner
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {optionWagers.length} wager{optionWagers.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${option.americanOdds > 0 ? "text-green-600" : "text-theme-primary"}`}>
                      {formatAmericanOdds(option.americanOdds)}
                    </p>
                    {isOpen && !userWager && (
                      <p className="text-xs text-muted-foreground mt-1">Tap to bet</p>
                    )}
                  </div>
                </div>

                {/* Wagers on this option */}
                {optionWagers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                      {optionWagers.map((wager) => (
                        <div
                          key={wager.id}
                          className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={wager.user?.avatar || undefined} />
                            <AvatarFallback className="text-xs bg-theme-gradient-br text-white">
                              {getInitials(wager.user?.username)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">
                            @{wager.user?.username}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(parseFloat(wager.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Place Wager Dialog */}
      <Dialog open={placeWagerOpen} onOpenChange={setPlaceWagerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Place Your Wager</DialogTitle>
            <DialogDescription>
              {selectedOptionData?.name} at {selectedOptionData && formatAmericanOdds(selectedOptionData.americanOdds)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Available Credits Display */}
            <div className="bg-theme-primary-50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-theme-primary" />
                <span className="text-sm font-medium text-foreground">Available Credits</span>
              </div>
              <span className="text-lg font-bold text-theme-primary">
                {formatCurrency(availableCredits)}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Wager Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="100"
                  value={wagerAmount}
                  onChange={(e) => setWagerAmount(e.target.value)}
                  className={`pl-9 text-lg ${insufficientCredits ? "border-red-300 focus-visible:ring-red-500" : ""}`}
                  max={availableCredits}
                />
              </div>
              {insufficientCredits && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Insufficient credits. Max: {formatCurrency(availableCredits)}</span>
                </div>
              )}
            </div>
            {potentialPayout > 0 && !insufficientCredits && (
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">If you win, you get</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(potentialPayout)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ({formatCurrency(potentialPayout - parseFloat(wagerAmount || "0"))} profit)
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPlaceWagerOpen(false);
                setSelectedOption(null);
                setWagerAmount("");
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePlaceWager}
              disabled={placeWagerMutation.isPending || !wagerAmount || insufficientCredits}
              className="w-full sm:w-auto bg-theme-gradient hover:opacity-90"
            >
              {placeWagerMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Place Wager"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Actions */}
      {isCreator && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-muted rounded-2xl p-4"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Bet Creator Actions</h3>
          <div className="flex flex-wrap gap-2">
            {isOpen && (
              <Button
                variant="outline"
                onClick={() => lockMutation.mutate({ betId })}
                disabled={lockMutation.isPending}
              >
                <Lock className="h-4 w-4 mr-2" />
                {lockMutation.isPending ? "Locking..." : "Lock Betting"}
              </Button>
            )}

            {(bet.status === "open" || bet.status === "locked") && (
              <Button
                variant="outline"
                onClick={() => setSettleOpen(true)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Settle Bet
              </Button>
            )}

            {(bet.status === "open" || bet.status === "locked") && (
              <Button
                variant="outline"
                onClick={() => cancelBetMutation.mutate({ betId })}
                disabled={cancelBetMutation.isPending}
                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
              >
                {cancelBetMutation.isPending ? "Cancelling..." : "Cancel Bet"}
              </Button>
            )}

            {bet.wagers?.length === 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Bet
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this bet?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate({ betId })}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </motion.div>
      )}

      {/* Settle Dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settle Bet</DialogTitle>
            <DialogDescription>
              Select the winning option to settle this bet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {bet.options?.map((option) => (
              <div
                key={option.id}
                onClick={() => setWinningOptionId(option.id)}
                className={`
                  rounded-xl border p-4 cursor-pointer transition-all
                  ${winningOptionId === option.id
                    ? "border-green-500 bg-green-50"
                    : "border-border hover:border-gray-300"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatAmericanOdds(option.americanOdds)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSettleOpen(false);
                setWinningOptionId(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (winningOptionId) {
                  settleMutation.mutate({ betId, winningOptionId });
                }
              }}
              disabled={settleMutation.isPending || !winningOptionId}
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
            >
              {settleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm Winner"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meta Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground flex flex-wrap gap-4"
      >
        <span>Created by @{bet.createdBy?.username}</span>
        <span>Created {new Date(bet.createdAt).toLocaleDateString()}</span>
        {bet.eventDate && (
          <span>Event: {new Date(bet.eventDate).toLocaleDateString()}</span>
        )}
      </motion.div>
    </div>
  );
}
