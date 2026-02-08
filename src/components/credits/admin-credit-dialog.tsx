"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { Loader2, Plus, Minus, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/odds";

interface AdminCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  targetUserId: string;
  targetUsername: string;
  currentBalance?: string;
  onSuccess?: () => void;
}

export function AdminCreditDialog({
  open,
  onOpenChange,
  groupId,
  targetUserId,
  targetUsername,
  currentBalance,
  onSuccess,
}: AdminCreditDialogProps) {
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const adjustMutation = trpc.credits.adjustCredits.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Credits ${mode === "add" ? "added" : "removed"} successfully`
      );
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setMode("add");
    setAmount("");
    setNote("");
  };

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const adjustedAmount = mode === "add" ? numAmount : -numAmount;

    adjustMutation.mutate({
      groupId,
      targetUserId,
      amount: adjustedAmount,
      note: note.trim() || undefined,
    });
  };

  const current = parseFloat(currentBalance || "0");
  const numAmount = parseFloat(amount) || 0;
  const preview =
    mode === "add" ? current + numAmount : Math.max(0, current - numAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Credits</DialogTitle>
          <DialogDescription>
            Modify credits for @{targetUsername}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "add" ? "default" : "outline"}
              onClick={() => setMode("add")}
              className={
                mode === "add"
                  ? "flex-1 bg-green-500 hover:bg-green-600"
                  : "flex-1"
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Credits
            </Button>
            <Button
              type="button"
              variant={mode === "remove" ? "default" : "outline"}
              onClick={() => setMode("remove")}
              className={
                mode === "remove"
                  ? "flex-1 bg-red-500 hover:bg-red-600"
                  : "flex-1"
              }
            >
              <Minus className="h-4 w-4 mr-2" />
              Remove Credits
            </Button>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="100"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 text-lg"
              />
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Reason for adjustment..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Preview */}
          {numAmount > 0 && (
            <div
              className={`rounded-xl p-4 ${
                mode === "add" ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-medium">{formatCurrency(current)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-muted-foreground">
                  {mode === "add" ? "Adding:" : "Removing:"}
                </span>
                <span
                  className={`font-medium ${
                    mode === "add" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {mode === "add" ? "+" : "-"}
                  {formatCurrency(numAmount)}
                </span>
              </div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">New Balance:</span>
                <span
                  className={`text-xl font-bold ${
                    mode === "add" ? "text-green-600" : "text-foreground"
                  }`}
                >
                  {formatCurrency(preview)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={adjustMutation.isPending || !amount || parseFloat(amount) <= 0}
            className={`w-full sm:w-auto ${
              mode === "add"
                ? "bg-green-500 hover:bg-green-600"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {adjustMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "add" ? (
              "Add Credits"
            ) : (
              "Remove Credits"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
