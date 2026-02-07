"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Layers,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { formatAmericanOdds, americanToDecimal } from "@/lib/odds";
import { motion, AnimatePresence } from "framer-motion";

interface BetOption {
  id: string;
  name: string;
  americanOdds: number;
}

interface Bet {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  options?: BetOption[];
  wagers?: { userId: string }[];
  createdById: string;
}

interface ParlayPick {
  betId: string;
  optionId: string;
  betTitle: string;
  optionName: string;
  odds: number;
}

interface ParlayBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bets: Bet[];
  currentUserId?: string;
  availableCredits?: number;
  onPlaceParlay: (legs: { betId: string; optionId: string }[], amount: number) => void;
  isPending?: boolean;
}

export function ParlayBuilderDialog({
  open,
  onOpenChange,
  bets,
  currentUserId,
  availableCredits,
  onPlaceParlay,
  isPending,
}: ParlayBuilderDialogProps) {
  const [picks, setPicks] = useState<ParlayPick[]>([]);
  const [amount, setAmount] = useState<string>("10");
  const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());

  // Filter to open bets only
  const openBets = useMemo(() => {
    return bets.filter((bet) => bet.status === "open" && bet.options && bet.options.length > 0);
  }, [bets]);

  // Calculate combined odds
  const parlayInfo = useMemo(() => {
    if (picks.length < 2) return { decimalOdds: 0, americanOdds: 0, payout: 0 };
    const combinedDecimal = picks.reduce((acc, pick) => acc * americanToDecimal(pick.odds), 1);
    const americanOdds = combinedDecimal >= 2
      ? Math.round((combinedDecimal - 1) * 100)
      : Math.round(-100 / (combinedDecimal - 1));
    const wagerAmount = parseFloat(amount) || 0;
    const payout = wagerAmount * combinedDecimal;
    return { decimalOdds: combinedDecimal, americanOdds, payout };
  }, [picks, amount]);

  const toggleBetExpanded = (betId: string) => {
    setExpandedBets((prev) => {
      const next = new Set(prev);
      if (next.has(betId)) {
        next.delete(betId);
      } else {
        next.add(betId);
      }
      return next;
    });
  };

  const togglePick = (bet: Bet, option: BetOption) => {
    setPicks((prev) => {
      const existingPick = prev.find((p) => p.betId === bet.id);
      if (existingPick) {
        // If clicking same option, remove it
        if (existingPick.optionId === option.id) {
          return prev.filter((p) => p.betId !== bet.id);
        }
        // If clicking different option, replace it
        return prev.map((p) =>
          p.betId === bet.id
            ? {
                betId: bet.id,
                optionId: option.id,
                betTitle: bet.title,
                optionName: option.name,
                odds: option.americanOdds,
              }
            : p
        );
      }
      // Add new pick
      return [
        ...prev,
        {
          betId: bet.id,
          optionId: option.id,
          betTitle: bet.title,
          optionName: option.name,
          odds: option.americanOdds,
        },
      ];
    });
  };

  const removePick = (betId: string) => {
    setPicks((prev) => prev.filter((p) => p.betId !== betId));
  };

  const handlePlaceParlay = () => {
    const wagerAmount = parseFloat(amount);
    if (picks.length < 2 || !wagerAmount || wagerAmount <= 0) return;
    onPlaceParlay(
      picks.map((p) => ({ betId: p.betId, optionId: p.optionId })),
      wagerAmount
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setPicks([]);
      setAmount("10");
      setExpandedBets(new Set());
    }, 200);
  };

  const getPickForBet = (betId: string) => picks.find((p) => p.betId === betId);
  const wagerAmount = parseFloat(amount) || 0;
  const canPlaceParlay =
    picks.length >= 2 &&
    wagerAmount > 0 &&
    (availableCredits === undefined || wagerAmount <= availableCredits);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-theme-primary" />
            Build a Parlay
          </DialogTitle>
          <DialogDescription>
            Select 2 or more outcomes to combine into a parlay bet
          </DialogDescription>
        </DialogHeader>

        {/* Picks summary - fixed at top */}
        {picks.length > 0 && (
          <div className="shrink-0 bg-theme-primary-50 rounded-xl p-3 border border-theme-primary-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-theme-primary">
                Your picks ({picks.length})
              </span>
              {picks.length >= 2 && (
                <span className="text-sm font-bold text-theme-primary">
                  {formatAmericanOdds(parlayInfo.americanOdds)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {picks.map((pick) => (
                <span
                  key={pick.optionId}
                  className="text-xs bg-white px-2 py-1 rounded-lg flex items-center gap-1 border border-theme-primary-100"
                >
                  <span className="max-w-[100px] truncate">{pick.optionName}</span>
                  <span className="text-theme-primary font-medium">
                    {formatAmericanOdds(pick.odds)}
                  </span>
                  <button
                    onClick={() => removePick(pick.betId)}
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {picks.length === 1 && (
              <p className="text-xs text-gray-500 mt-2">
                Select 1 more bet to create a parlay
              </p>
            )}
          </div>
        )}

        {/* Scrollable bets list */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full max-h-[40vh]">
            <div className="space-y-2 pr-3">
              {openBets.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No open bets available</p>
                  <p className="text-gray-400 text-sm">
                    Create a bet first to build parlays
                  </p>
                </div>
              ) : (
                openBets.map((bet) => {
                  const pick = getPickForBet(bet.id);
                  const isExpanded = expandedBets.has(bet.id) || !!pick;

                  return (
                    <div
                      key={bet.id}
                      className={`border rounded-xl overflow-hidden transition-all ${
                        pick
                          ? "border-theme-primary-300 bg-theme-primary-50/50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      {/* Bet header */}
                      <button
                        type="button"
                        onClick={() => toggleBetExpanded(bet.id)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-left flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 truncate">
                              {bet.title}
                            </h4>
                            {pick && (
                              <Badge className="bg-theme-primary-100 text-theme-primary text-xs shrink-0">
                                <Check className="h-3 w-3 mr-1" />
                                {pick.optionName}
                              </Badge>
                            )}
                          </div>
                          {bet.description && !isExpanded && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {bet.description}
                            </p>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                        )}
                      </button>

                      {/* Options (expanded) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 pt-1 space-y-2">
                              {bet.description && (
                                <p className="text-xs text-gray-500 mb-2">
                                  {bet.description}
                                </p>
                              )}
                              <div className="grid gap-2">
                                {bet.options?.map((option) => {
                                  const isSelected = pick?.optionId === option.id;
                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onClick={() => togglePick(bet, option)}
                                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                                        isSelected
                                          ? "border-theme-primary bg-theme-primary-100 text-theme-primary"
                                          : "border-gray-200 bg-gray-50 hover:border-theme-primary-200 hover:bg-theme-primary-50"
                                      }`}
                                    >
                                      <span className="font-medium flex items-center gap-2">
                                        {isSelected && <Check className="h-4 w-4" />}
                                        {option.name}
                                      </span>
                                      <span
                                        className={`font-bold ${
                                          isSelected
                                            ? "text-theme-primary"
                                            : option.americanOdds >= 0
                                            ? "text-emerald-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        {formatAmericanOdds(option.americanOdds)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Amount and payout - fixed at bottom */}
        {picks.length >= 2 && (
          <div className="shrink-0 border-t pt-4 space-y-3">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="parlayAmount">Wager Amount</Label>
                <Input
                  id="parlayAmount"
                  type="number"
                  min="1"
                  placeholder="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {availableCredits !== undefined && (
                  <p className="text-xs text-gray-500">
                    Available: ${availableCredits.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="text-right pb-1">
                <p className="text-xs text-gray-500 mb-1">Potential Payout</p>
                <p className="text-xl font-bold text-theme-primary">
                  ${parlayInfo.payout.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">
                  ${(parlayInfo.payout - wagerAmount).toFixed(2)} profit
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 flex-col sm:flex-row gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handlePlaceParlay}
            disabled={!canPlaceParlay || isPending}
            className="w-full sm:w-auto bg-theme-gradient"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : picks.length < 2 ? (
              `Select ${2 - picks.length} more`
            ) : (
              `Place Parlay (${formatAmericanOdds(parlayInfo.americanOdds)})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
