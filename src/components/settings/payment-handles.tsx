"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export function PaymentHandlesForm() {
  const { data: me, isLoading } = trpc.auth.getMe.useQuery();
  const utils = trpc.useUtils();

  const [venmo, setVenmo] = useState("");
  const [cashapp, setCashapp] = useState("");
  const [paypal, setPaypal] = useState("");

  useEffect(() => {
    if (me) {
      setVenmo(me.venmoHandle ?? "");
      setCashapp(me.cashappHandle ?? "");
      setPaypal(me.paypalHandle ?? "");
    }
  }, [me]);

  const mutation = trpc.auth.updatePaymentHandles.useMutation({
    onSuccess: () => {
      toast.success("Payment handles saved!");
      utils.auth.getMe.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      venmoHandle: venmo.trim() || null,
      cashappHandle: cashapp.trim() || null,
      paypalHandle: paypal.trim() || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="venmo" className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-sm"
            style={{ backgroundColor: "#008CFF" }}
          />
          Venmo Username
        </Label>
        <Input
          id="venmo"
          placeholder="e.g. john-doe-42"
          value={venmo}
          onChange={(e) => setVenmo(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Your Venmo username (without the @)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cashapp" className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-sm"
            style={{ backgroundColor: "#00D632" }}
          />
          CashApp $cashtag
        </Label>
        <Input
          id="cashapp"
          placeholder="e.g. johndoe"
          value={cashapp}
          onChange={(e) => setCashapp(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Your CashApp $cashtag (without the $)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paypal" className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-sm"
            style={{ backgroundColor: "#003087" }}
          />
          PayPal.me Username
        </Label>
        <Input
          id="paypal"
          placeholder="e.g. JohnDoe"
          value={paypal}
          onChange={(e) => setPaypal(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Your PayPal.me username
        </p>
      </div>

      <Button
        type="submit"
        disabled={mutation.isPending}
        className="bg-theme-gradient hover:opacity-90"
      >
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save Payment Handles
      </Button>
    </form>
  );
}
