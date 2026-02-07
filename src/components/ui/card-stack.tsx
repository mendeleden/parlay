"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardStackProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function CardStack({ children, className, delay = 0 }: CardStackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  gradient?: "purple" | "green" | "blue" | "orange";
}

export function GlassCard({
  children,
  className,
  gradient = "purple",
}: GlassCardProps) {
  const gradients = {
    purple: "from-violet-500/10 via-fuchsia-500/10 to-purple-500/10",
    green: "from-emerald-500/10 via-green-500/10 to-teal-500/10",
    blue: "from-blue-500/10 via-cyan-500/10 to-sky-500/10",
    orange: "from-orange-500/10 via-amber-500/10 to-yellow-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        `bg-gradient-to-br ${gradients[gradient]} backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl`,
        className
      )}
    >
      {children}
    </motion.div>
  );
}
