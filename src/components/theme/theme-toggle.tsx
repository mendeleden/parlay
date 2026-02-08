"use client";

import { useTheme } from "./theme-context";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "light" | "dark";
}

export function ThemeToggle({ variant = "light" }: ThemeToggleProps) {
  const { mode, toggleMode } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleMode}
      className={cn(
        "h-9 w-9",
        variant === "dark"
          ? "text-white/80 hover:text-white hover:bg-white/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {mode === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  );
}
