"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/odds";
import { RecordPaymentDialog } from "./record-payment-dialog";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ExternalLink,
  Check,
  X,
  Loader2,
  Receipt,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

interface GroupLedgerProps {
  groupId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function GroupLedger({ groupId, currentUserId, isAdmin }: GroupLedgerProps) {
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: ledger, isLoading: ledgerLoading } =
    trpc.settlements.getGroupLedger.useQuery(
      { groupId },
      { enabled: !!groupId }
    );

  const { data: settlementsList, isLoading: settlementsLoading } =
    trpc.settlements.getGroupSettlements.useQuery(
      { groupId },
      { enabled: !!groupId }
    );

  const confirmMutation = trpc.settlements.confirmPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment confirmed!");
      utils.settlements.getGroupSettlements.invalidate({ groupId });
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = trpc.settlements.rejectPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment rejected");
      utils.settlements.getGroupSettlements.invalidate({ groupId });
    },
    onError: (error) => toast.error(error.message),
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getMethodLabel = (method: string | null) => {
    switch (method) {
      case "venmo": return "Venmo";
      case "cashapp": return "CashApp";
      case "paypal": return "PayPal";
      case "cash": return "Cash";
      case "other": return "Other";
      default: return null;
    }
  };

  const members = (ledger || []).map((m) => ({
    userId: m.userId,
    username: m.username,
    avatar: m.avatar,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-theme-primary" />
          <h3 className="text-lg font-semibold text-foreground">Group Ledger</h3>
        </div>
        <Button
          size="sm"
          onClick={() => setRecordPaymentOpen(true)}
          className="bg-theme-gradient hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-1" />
          Record Payment
        </Button>
      </div>

      {/* Net P&L */}
      {ledgerLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-theme-primary" />
        </div>
      ) : !ledger || ledger.length === 0 ? (
        <div className="bg-muted rounded-2xl p-6 text-center">
          <p className="text-muted-foreground">No members found</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Net Profit / Loss
          </h4>
          <div className="space-y-2.5">
            {ledger.map((member) => {
              const pnl = parseFloat(member.netPnL);
              const isCurrentUser = member.userId === currentUserId;
              const oweMoney = pnl < 0;

              return (
                <div
                  key={member.userId}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl ${
                    isCurrentUser ? "bg-theme-primary-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback className="text-xs bg-theme-gradient-br text-white">
                        {getInitials(member.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground truncate">
                      @{member.username}
                      {isCurrentUser && (
                        <span className="text-muted-foreground"> (you)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pnl > 0 ? (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">
                          +{formatCurrency(pnl)}
                        </span>
                      </div>
                    ) : pnl < 0 ? (
                      <div className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-600">
                          {formatCurrency(pnl)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        Even
                      </span>
                    )}
                    {/* Show payment links if current user owes this person */}
                    {isCurrentUser === false &&
                      currentUserId &&
                      ledger.find((m) => m.userId === currentUserId) &&
                      parseFloat(
                        ledger.find((m) => m.userId === currentUserId)!.netPnL
                      ) < 0 &&
                      pnl > 0 && (
                        <div className="flex items-center gap-1">
                          {member.venmoHandle && (
                            <a
                              href={`venmo://paycharge?txn=pay&recipients=${encodeURIComponent(member.venmoHandle)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium text-white hover:opacity-80"
                              style={{ backgroundColor: "#008CFF" }}
                            >
                              Venmo
                            </a>
                          )}
                          {member.cashappHandle && (
                            <a
                              href={`https://cash.app/$${encodeURIComponent(member.cashappHandle)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium text-white hover:opacity-80"
                              style={{ backgroundColor: "#00D632" }}
                            >
                              CashApp
                            </a>
                          )}
                          {member.paypalHandle && (
                            <a
                              href={`https://paypal.me/${encodeURIComponent(member.paypalHandle)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium text-white hover:opacity-80"
                              style={{ backgroundColor: "#003087" }}
                            >
                              PayPal
                            </a>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Settlement History */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-muted-foreground">
            Settlement History
          </h4>
        </div>

        {settlementsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-theme-primary" />
          </div>
        ) : !settlementsList || settlementsList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No payments recorded yet
          </p>
        ) : (
          <div className="space-y-3">
            {settlementsList.map((s) => {
              const canAction =
                s.status === "pending" &&
                (s.toUserId === currentUserId || isAdmin);

              return (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted rounded-xl"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={s.fromAvatar || undefined} />
                      <AvatarFallback className="text-[10px] bg-theme-gradient-br text-white">
                        {getInitials(s.fromUsername)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">
                      @{s.fromUsername}
                    </span>
                    <span className="text-xs text-muted-foreground">paid</span>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={s.toAvatar || undefined} />
                      <AvatarFallback className="text-[10px] bg-theme-gradient-br text-white">
                        {getInitials(s.toUsername)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">
                      @{s.toUsername}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(parseFloat(s.amount))}
                    </span>
                    {s.method && (
                      <span className="text-xs text-muted-foreground">
                        via {getMethodLabel(s.method)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={
                        s.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : s.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }
                    >
                      {s.status}
                    </Badge>
                    {canAction && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() =>
                            rejectMutation.mutate({ settlementId: s.id })
                          }
                          disabled={rejectMutation.isPending}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600"
                          onClick={() =>
                            confirmMutation.mutate({ settlementId: s.id })
                          }
                          disabled={confirmMutation.isPending}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        groupId={groupId}
        members={members}
        currentUserId={currentUserId}
        onSuccess={() => {
          utils.settlements.getGroupSettlements.invalidate({ groupId });
        }}
      />
    </div>
  );
}
