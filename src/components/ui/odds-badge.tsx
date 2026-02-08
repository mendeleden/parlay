"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatAmericanOdds } from "@/lib/odds";

interface OddsBadgeProps {
  odds: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function OddsBadge({
  odds,
  size = "md",
  interactive = false,
  selected = false,
  onClick,
}: OddsBadgeProps) {
  const isPositive = odds > 0;

  const sizes = {
    sm: "text-sm px-2 py-1",
    md: "text-base px-3 py-1.5",
    lg: "text-xl px-4 py-2 font-bold",
  };

  return (
    <motion.div
      whileHover={interactive ? { scale: 1.05 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl font-semibold transition-all duration-200",
        sizes[size],
        isPositive
          ? "bg-emerald-500 text-white"
          : "bg-theme-gradient text-white",
        interactive && "cursor-pointer hover:shadow-lg",
        selected && "ring-2 ring-offset-2 ring-yellow-400"
      )}
    >
      {formatAmericanOdds(odds)}
    </motion.div>
  );
}

interface OddsCardProps {
  name: string;
  odds: number;
  wagerCount?: number;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function OddsCard({
  name,
  odds,
  wagerCount = 0,
  selected = false,
  onClick,
  disabled = false,
}: OddsCardProps) {
  const isPositive = odds > 0;

  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.02, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 transition-all duration-300",
        disabled
          ? "bg-muted cursor-not-allowed opacity-60"
          : "bg-card border-2 cursor-pointer hover:shadow-xl hover:shadow-theme",
        selected
          ? "border-theme-primary-500 bg-theme-primary-50"
          : "border-border hover:border-theme-primary-300"
      )}
    >
      {/* Background gradient effect */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-300",
          !disabled && "group-hover:opacity-100",
          isPositive
            ? "bg-gradient-to-br from-emerald-500/5 to-green-500/5"
            : "bg-theme-gradient-light"
        )}
      />

      <div className="relative flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">{name}</h4>
          {wagerCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {wagerCount} wager{wagerCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <OddsBadge odds={odds} size="lg" />
      </div>

      {/* Selected indicator */}
      {selected && (
        <motion.div
          layoutId="selectedIndicator"
          className="absolute bottom-0 left-0 right-0 h-1 bg-theme-gradient"
        />
      )}
    </motion.div>
  );
}
