"use client";

import { motion } from "framer-motion";
import { Check, TrendingUp, Clock, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAmericanOdds } from "@/lib/odds";
import type { ExternalMarket } from "@/lib/polymarket";

interface MarketCardProps {
  market: ExternalMarket;
  selected?: boolean;
  onSelect?: () => void;
  onPreview?: () => void;
  disabled?: boolean;
}

export function MarketCard({
  market,
  selected = false,
  onSelect,
  onPreview,
  disabled = false,
}: MarketCardProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const endDate = formatDate(market.endDate);

  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.01, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.99 } : undefined}
      onClick={!disabled ? onSelect : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white border-2 transition-all duration-200",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:shadow-lg",
        selected
          ? "border-theme-primary-500 bg-theme-primary-50/50 ring-2 ring-theme-primary-200"
          : "border-gray-100 hover:border-gray-200"
      )}
    >
      {/* Header - with or without image */}
      <div className={cn(
        "relative h-24 overflow-hidden",
        market.imageUrl
          ? "bg-gradient-to-br from-gray-100 to-gray-50"
          : market.source === "kalshi"
          ? "bg-gradient-to-br from-emerald-500 to-teal-600"
          : "bg-gradient-to-br from-violet-500 to-purple-600"
      )}>
        {market.imageUrl && (
          <>
            <img
              src={market.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </>
        )}

        {/* Source badge */}
        <div className={cn(
          "absolute bottom-2 right-2 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
          market.imageUrl
            ? "bg-black/60 backdrop-blur-sm text-white"
            : "bg-white/20 backdrop-blur-sm text-white"
        )}>
          {market.source === "kalshi" ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {market.source === "kalshi" ? "Kalshi" : "Polymarket"}
        </div>

        {/* Volume badge */}
        <div className={cn(
          "absolute top-2 right-2 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
          market.imageUrl
            ? "bg-black/60 backdrop-blur-sm text-white"
            : "bg-white/20 backdrop-blur-sm text-white"
        )}>
          <TrendingUp className="w-3 h-3" />
          {market.volume}
        </div>

        {/* Selection checkbox */}
        {onSelect && (
          <div
            className={cn(
              "absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
              selected
                ? "bg-theme-primary-500 border-theme-primary-500"
                : market.imageUrl
                ? "bg-white/80 backdrop-blur-sm border-gray-300"
                : "bg-white/30 backdrop-blur-sm border-white/50"
            )}
          >
            {selected && <Check className="w-4 h-4 text-white" />}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-3">
          {market.title}
        </h3>

        {/* Options with odds */}
        <div className="space-y-2 mb-3">
          {market.options.slice(0, 2).map((option, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-600 truncate flex-1 mr-2">
                {option.name}
              </span>
              <span
                className={cn(
                  "font-mono font-semibold px-2 py-0.5 rounded-md text-xs",
                  option.americanOdds > 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-theme-primary-100 text-theme-primary-700"
                )}
              >
                {formatAmericanOdds(option.americanOdds)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          {endDate && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {endDate}
            </div>
          )}

          {/* View Details button */}
          {onPreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="flex items-center gap-1 text-theme-primary-600 hover:text-theme-primary-700 font-medium"
            >
              <Info className="w-3 h-3" />
              Details
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Compact market card for list views
 */
export function MarketCardCompact({
  market,
  selected = false,
  onSelect,
  disabled = false,
}: MarketCardProps) {
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.005 } : undefined}
      onClick={!disabled ? onSelect : undefined}
      className={cn(
        "relative flex items-center gap-4 p-4 rounded-xl bg-white border-2 transition-all duration-200",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:shadow-md",
        selected
          ? "border-theme-primary-500 bg-theme-primary-50/50"
          : "border-gray-100 hover:border-gray-200"
      )}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            selected
              ? "bg-theme-primary-500 border-theme-primary-500"
              : "border-gray-300"
          )}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
      )}

      {/* Image */}
      {market.imageUrl && (
        <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
          <img
            src={market.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 text-sm truncate">
          {market.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {market.options.slice(0, 2).map((option, idx) => (
            <span
              key={idx}
              className={cn(
                "text-xs font-mono font-semibold px-1.5 py-0.5 rounded",
                option.americanOdds > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-theme-primary-100 text-theme-primary-700"
              )}
            >
              {option.name}: {formatAmericanOdds(option.americanOdds)}
            </span>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div className="flex-shrink-0 text-right">
        <div className="text-xs font-medium text-gray-900">{market.volume}</div>
        <div className="text-xs text-gray-500">volume</div>
      </div>
    </motion.div>
  );
}
