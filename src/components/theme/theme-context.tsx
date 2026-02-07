"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeName = "violet" | "ocean" | "sunset";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "parlay-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("violet");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
    if (storedTheme && ["violet", "ocean", "sunset"].includes(storedTheme)) {
      setThemeState(storedTheme);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      // Remove previous theme classes
      document.documentElement.classList.remove("theme-violet", "theme-ocean", "theme-sunset");
      // Add current theme class
      document.documentElement.classList.add(`theme-${theme}`);
      // Store in localStorage
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
  };

  // Prevent flash of incorrect theme
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: "violet", setTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
