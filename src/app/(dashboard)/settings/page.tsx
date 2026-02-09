"use client";

import { Settings } from "lucide-react";
import { PaymentHandlesForm } from "@/components/settings/payment-handles";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-theme-primary-100 rounded-xl">
          <Settings className="h-5 w-5 text-theme-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Payment Handles
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Add your payment handles so others can settle up with you after bets.
        </p>
        <PaymentHandlesForm />
      </div>
    </div>
  );
}
