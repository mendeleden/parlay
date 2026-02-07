"use client";

import { motion } from "framer-motion";
import { Coins, Lock, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/odds";

interface CreditDisplayProps {
  availableBalance: string;
  allocatedBalance: string;
  totalBalance: string;
  variant?: "full" | "compact";
}

export function CreditDisplay({
  availableBalance,
  allocatedBalance,
  totalBalance,
  variant = "full",
}: CreditDisplayProps) {
  const available = parseFloat(availableBalance);
  const allocated = parseFloat(allocatedBalance);
  const total = parseFloat(totalBalance);

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Coins className="h-4 w-4 text-theme-primary" />
        <span className="font-medium text-gray-900">
          {formatCurrency(available)}
        </span>
        {allocated > 0 && (
          <span className="text-gray-400">
            ({formatCurrency(allocated)} locked)
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-theme-gradient-light rounded-2xl p-5 border border-theme-primary-100"
    >
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="h-5 w-5 text-theme-primary" />
        <h3 className="font-semibold text-gray-900">Your Credits</h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Coins className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(available)}
          </p>
          <p className="text-xs text-gray-500">Available</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Lock className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(allocated)}
          </p>
          <p className="text-xs text-gray-500">In Bets</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Wallet className="h-4 w-4 text-theme-primary" />
          </div>
          <p className="text-2xl font-bold text-theme-primary">
            {formatCurrency(total)}
          </p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
      </div>
    </motion.div>
  );
}
