"use client";

import { motion } from "framer-motion";
import { Clock, Lock, CheckCircle, Layers } from "lucide-react";

type FilterOption = "all" | "open" | "locked" | "settled";

interface BetFilterProps {
  value: FilterOption;
  onChange: (value: FilterOption) => void;
  counts: {
    all: number;
    open: number;
    locked: number;
    settled: number;
  };
}

const filterConfig: Record<FilterOption, { label: string; icon: React.ElementType }> = {
  all: { label: "All", icon: Layers },
  open: { label: "Open", icon: Clock },
  locked: { label: "Locked", icon: Lock },
  settled: { label: "Settled", icon: CheckCircle },
};

export function BetFilter({ value, onChange, counts }: BetFilterProps) {
  const filters: FilterOption[] = ["all", "open", "locked", "settled"];

  return (
    <div className="relative">
      {/* Container with subtle inset shadow for depth */}
      <div className="relative flex bg-muted backdrop-blur-sm p-1 rounded-xl shadow-inner">
        {/* Animated pill background */}
        <motion.div
          layoutId="activeFilter"
          className="absolute top-1 bottom-1 bg-card rounded-lg shadow-sm"
          style={{
            left: `calc(${filters.indexOf(value)} * 25% + 4px)`,
            width: "calc(25% - 8px)",
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />

        {/* Filter buttons */}
        {filters.map((filter) => {
          const config = filterConfig[filter];
          const Icon = config.icon;
          const isActive = value === filter;
          const count = counts[filter];

          return (
            <button
              key={filter}
              onClick={() => onChange(filter)}
              className={`
                relative flex-1 flex items-center justify-center gap-1.5
                py-2 px-2 rounded-lg text-sm font-medium
                transition-colors duration-200 z-10
                ${isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-theme-primary" : ""}`} />
              <span className="hidden sm:inline">{config.label}</span>
              <span
                className={`
                  min-w-[1.25rem] h-5 flex items-center justify-center
                  text-xs font-semibold rounded-full px-1.5
                  ${isActive
                    ? "bg-theme-primary-100 text-theme-primary"
                    : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface EmptyFilterStateProps {
  filter: FilterOption;
}

export function EmptyFilterState({ filter }: EmptyFilterStateProps) {
  const messages: Record<FilterOption, { title: string; subtitle: string }> = {
    all: {
      title: "No bets yet",
      subtitle: "Create the first bet for your group"
    },
    open: {
      title: "No open bets",
      subtitle: "All bets are either locked or settled"
    },
    locked: {
      title: "No locked bets",
      subtitle: "Open bets will lock when betting closes"
    },
    settled: {
      title: "No settled bets",
      subtitle: "Settled bets will appear here"
    },
  };

  const config = filterConfig[filter];
  const Icon = config.icon;
  const message = messages[filter];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-foreground font-medium text-center">{message.title}</p>
      <p className="text-muted-foreground text-sm text-center mt-1">{message.subtitle}</p>
    </motion.div>
  );
}
