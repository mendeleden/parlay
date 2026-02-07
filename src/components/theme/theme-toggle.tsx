"use client";

import { useTheme, type ThemeName } from "./theme-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const themes: { name: ThemeName; label: string; colors: string[] }[] = [
  {
    name: "indigo",
    label: "Indigo",
    colors: ["bg-indigo-500", "bg-violet-500"],
  },
  {
    name: "emerald",
    label: "Emerald",
    colors: ["bg-emerald-500", "bg-teal-500"],
  },
  {
    name: "rose",
    label: "Rose",
    colors: ["bg-rose-500", "bg-pink-500"],
  },
];

interface ThemeToggleProps {
  variant?: "light" | "dark";
}

export function ThemeToggle({ variant = "light" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9",
            variant === "dark"
              ? "text-white/80 hover:text-white hover:bg-white/10"
              : "text-theme-primary hover:bg-theme-primary/10"
          )}
        >
          <Palette className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.name}
            onClick={() => setTheme(t.name)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              theme === t.name && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {t.colors.map((color, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-4 h-4 rounded-full border-2 border-white",
                      color
                    )}
                  />
                ))}
              </div>
              <span>{t.label}</span>
            </div>
            {theme === t.name && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
