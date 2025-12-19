import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "cosmos_theme";

function getSystemPrefersDark() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "light";
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return "light";
      const parsed = JSON.parse(stored);
      return parsed.mode || "light";
    } catch {
      return "light";
    }
  });

  const [accent, setAccent] = useState(() => {
    if (typeof window === "undefined") return "indigo";
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return "indigo";
      const parsed = JSON.parse(stored);
      return parsed.accent || "indigo";
    } catch {
      return "indigo";
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode, accent })
      );
    } catch {
      // ignore
    }
  }, [mode, accent]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const effectiveDark =
      mode === "dark" || (mode === "auto" && getSystemPrefersDark());
    if (effectiveDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [mode]);

  const value = useMemo(
    () => ({ mode, setMode, accent, setAccent }),
    [mode, accent]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
