"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedNumber({
  value,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedNumberProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) =>
    current.toFixed(decimals)
  );
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return display.on("change", (v) => setDisplayValue(v));
  }, [display]);

  return (
    <motion.span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </motion.span>
  );
}

interface AnimatedCurrencyProps {
  value: number;
  className?: string;
}

export function AnimatedCurrency({ value, className }: AnimatedCurrencyProps) {
  return (
    <AnimatedNumber
      value={value}
      prefix="$"
      decimals={2}
      className={className}
    />
  );
}

interface AnimatedOddsProps {
  value: number;
  className?: string;
}

export function AnimatedOdds({ value, className }: AnimatedOddsProps) {
  const prefix = value > 0 ? "+" : "";
  return (
    <AnimatedNumber value={value} prefix={prefix} decimals={0} className={className} />
  );
}
