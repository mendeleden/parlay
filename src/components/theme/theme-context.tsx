"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ColorMode = "light" | "dark";

interface ThemeContextType {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = "parlay-color-mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY) as ColorMode | null;
    if (storedMode && ["light", "dark"].includes(storedMode)) {
      setModeState(storedMode);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setModeState("dark");
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(mode);
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    }
  }, [mode, mounted]);

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
  };

  const toggleMode = () => {
    setModeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ mode: "light", setMode, toggleMode }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
