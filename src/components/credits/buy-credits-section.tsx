"use client";

import { motion } from "framer-motion";
import { ExternalLink, Coins, Info } from "lucide-react";
import { trpc } from "@/trpc/client";
import { Loader2 } from "lucide-react";

interface BuyCreditsSectionProps {
  groupId: string;
  isAdmin?: boolean;
}

export function BuyCreditsSection({ groupId, isAdmin }: BuyCreditsSectionProps) {
  const { data: adminInfo, isLoading } = trpc.settlements.getAdminPaymentInfo.useQuery(
    { groupId },
    { enabled: !!groupId }
  );

  if (isLoading) return null;

  if (isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Coins className="h-5 w-5 text-theme-primary" />
          <h3 className="font-semibold text-foreground">Buy Credits</h3>
        </div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Members will send you money off-app. Use &quot;Adjust Credits&quot; on the
            Members tab to add their credits after receiving payment.
          </p>
        </div>
      </motion.div>
    );
  }

  const hasPaymentHandles =
    adminInfo?.venmoHandle || adminInfo?.cashappHandle || adminInfo?.paypalHandle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-5"
    >
      <div className="flex items-center gap-2 mb-2">
        <Coins className="h-5 w-5 text-theme-primary" />
        <h3 className="font-semibold text-foreground">Buy Credits</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Send money to the group admin, then they&apos;ll add credits to your account.
      </p>

      {!hasPaymentHandles ? (
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted rounded-xl p-3">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Ask your group admin (@{adminInfo?.username}) to add their payment
            info in Settings.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {adminInfo.venmoHandle && (
            <a
              href={`venmo://paycharge?txn=pay&recipients=${encodeURIComponent(adminInfo.venmoHandle)}&note=${encodeURIComponent("Buy credits")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#008CFF" }}
            >
              Venmo @{adminInfo.venmoHandle}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {adminInfo.cashappHandle && (
            <a
              href={`https://cash.app/$${encodeURIComponent(adminInfo.cashappHandle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#00D632" }}
            >
              CashApp ${adminInfo.cashappHandle}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {adminInfo.paypalHandle && (
            <a
              href={`https://paypal.me/${encodeURIComponent(adminInfo.paypalHandle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#003087" }}
            >
              PayPal @{adminInfo.paypalHandle}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
