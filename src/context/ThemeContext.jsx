/**
 * ThemeContext - Application Theme Management
 *
 * Purpose: Provides theme state (light/dark/auto mode and accent color) to the
 * entire application through React Context, with localStorage persistence.
 *
 * Responsibilities:
 * - Manages theme mode (light, dark, auto) and accent color preferences
 * - Persists theme preferences to localStorage for cross-session consistency
 * - Applies dark mode class to document root for Tailwind CSS dark mode
 * - Respects system color scheme preference when mode is 'auto'
 *
 * Dependencies:
 * - React Context API
 * - Browser localStorage API
 * - Browser matchMedia API (for system preference detection)
 *
 * Last Modified: 2026-01-10
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

// STORAGE KEY: Unique key for localStorage to avoid conflicts with other apps
const STORAGE_KEY = "cosmos_theme";

/**
 * Detects if the user's system prefers dark mode.
 *
 * @returns {boolean} True if system is set to dark mode preference
 *
 * Side Effects: None (read-only query)
 *
 * BROWSER COMPATIBILITY: Returns false for SSR or browsers without matchMedia support
 */
function getSystemPrefersDark() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * ThemeProvider - Context provider for theme management.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 *
 * Business Logic:
 * - Initializes theme from localStorage on mount, defaults to 'light' mode
 * - Persists any theme changes back to localStorage automatically
 * - Applies 'dark' class to <html> element for Tailwind dark mode support
 * - Supports 'auto' mode which follows system preference
 *
 * Side Effects:
 * - Reads/writes to localStorage (STORAGE_KEY)
 * - Modifies document.documentElement classList
 *
 * @returns {JSX.Element} Context provider wrapping children
 */
export function ThemeProvider({ children }) {
  // Initialize mode from localStorage with 'light' as fallback
  // SSR SAFETY: Check for window before accessing localStorage
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "light";
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return "light";
      const parsed = JSON.parse(stored);
      return parsed.mode || "light";
    } catch {
      // GRACEFUL DEGRADATION: If localStorage is corrupted or blocked, use default
      return "light";
    }
  });

  // Initialize accent color from localStorage with 'indigo' as default brand color
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

  // PERSISTENCE EFFECT: Sync theme preferences to localStorage on any change
  // Business Decision: Store both mode and accent together for atomic updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode, accent })
      );
    } catch {
      // SILENT FAIL: localStorage may be blocked in incognito mode or full
      // User experience is unaffected; preferences just won't persist
    }
  }, [mode, accent]);

  // DOM EFFECT: Apply dark mode class to document root for Tailwind CSS
  // TAILWIND INTEGRATION: Tailwind's dark: variants depend on 'dark' class on <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    // AUTO MODE LOGIC: Use system preference when mode is 'auto'
    const effectiveDark =
      mode === "dark" || (mode === "auto" && getSystemPrefersDark());
    if (effectiveDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [mode]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo(
    () => ({ mode, setMode, accent, setAccent }),
    [mode, accent]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * useTheme - Custom hook to access theme context.
 *
 * @returns {Object} Theme context containing:
 *   - mode: Current theme mode ('light', 'dark', or 'auto')
 *   - setMode: Function to update theme mode
 *   - accent: Current accent color name (e.g., 'indigo', 'blue')
 *   - setAccent: Function to update accent color
 *
 * @throws {Error} If used outside of ThemeProvider
 *
 * @example
 * const { mode, setMode, accent } = useTheme();
 * setMode('dark'); // Switch to dark mode
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  // DEVELOPER GUARD: Throw descriptive error if hook is misused
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
