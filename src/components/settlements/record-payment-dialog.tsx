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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { DollarSign, Loader2 } from "lucide-react";

interface Member {
  userId: string;
  username: string | null;
  avatar: string | null;
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  members: Member[];
  currentUserId?: string;
  onSuccess: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  groupId,
  members,
  currentUserId,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");

  const recordMutation = trpc.settlements.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded! Waiting for confirmation.");
      onOpenChange(false);
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setToUserId("");
    setAmount("");
    setMethod("");
    setNote("");
  };

  const handleSubmit = () => {
    if (!toUserId) {
      toast.error("Please select a recipient");
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    recordMutation.mutate({
      groupId,
      toUserId,
      amount: amountNum,
      method: method || undefined,
      note: note || undefined,
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const otherMembers = members.filter((m) => m.userId !== currentUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record an off-app payment you made to another member.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Paid To</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {otherMembers.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.avatar || undefined} />
                        <AvatarFallback className="text-[10px] bg-theme-gradient-br text-white">
                          {getInitials(m.username)}
                        </AvatarFallback>
                      </Avatar>
                      @{m.username}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="paymentAmount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select method (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="cashapp">CashApp</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentNote">Note (optional)</Label>
            <Textarea
              id="paymentNote"
              placeholder="e.g., For Super Bowl bet"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
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
            disabled={recordMutation.isPending || !toUserId || !amount}
            className="w-full sm:w-auto bg-theme-gradient hover:opacity-90"
          >
            {recordMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Record Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
