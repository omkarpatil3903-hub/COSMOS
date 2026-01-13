/**
 * AppLoader Component
 *
 * Purpose: Full-screen skeleton loader shown during initial auth check.
 * Reads theme from localStorage before React context is available.
 *
 * Responsibilities:
 * - Display skeleton sidebar with nav items
 * - Display skeleton main content (header, stat cards, charts)
 * - Theme-aware colors (reads localStorage directly)
 * - Support for "auto" mode (checks system preference)
 *
 * Dependencies:
 * - react-icons (FaShieldAlt for logo)
 *
 * Theme Detection:
 * - Reads "cosmos_theme" from localStorage
 * - Handles "light", "dark", and "auto" modes
 * - Falls back to light mode if not found
 *
 * Skeleton Sections:
 * - Sidebar: Logo, 10 nav items, logout button
 * - Main: Header, 4 stat cards, 2 charts
 *
 * Last Modified: 2026-01-10
 */

import React, { useMemo } from "react";
import { FaShieldAlt } from "react-icons/fa";

// Read theme from localStorage before React context is available
function getStoredTheme() {
    if (typeof window === "undefined") return { isDark: false };
    try {
        const stored = window.localStorage.getItem("cosmos_theme");
        if (!stored) return { isDark: false };
        const parsed = JSON.parse(stored);
        const mode = parsed.mode || "light";
        // Handle 'auto' mode by checking system preference
        if (mode === "auto") {
            const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
            return { isDark: prefersDark };
        }
        return { isDark: mode === "dark" };
    } catch {
        return { isDark: false };
    }
}

function AppLoader() {
    const { isDark } = useMemo(() => getStoredTheme(), []);

    // Theme-aware color classes
    const colors = isDark
        ? {
            bg: "bg-[#0f0f0f]",
            surface: "bg-[#1a1a1a]",
            skeleton: "bg-[#2a2a2a]",
            border: "border-[#2a2a2a]",
            text: "text-white",
            textMuted: "text-gray-400",
            overlay: "bg-black/40",
            loaderBg: "bg-[#1a1a1a]/95",
            logoutBg: "bg-red-900/30",
        }
        : {
            bg: "bg-gray-50",
            surface: "bg-white",
            skeleton: "bg-gray-200",
            border: "border-gray-200",
            text: "text-gray-900",
            textMuted: "text-gray-500",
            overlay: "bg-white/40",
            loaderBg: "bg-white/95",
            logoutBg: "bg-red-100",
        };

    return (
        <div className={`flex min-h-screen ${colors.bg} ${colors.text}`}>
            {/* Skeleton Sidebar */}
            <aside className={`fixed inset-y-0 left-0 hidden lg:flex w-72 flex-col ${colors.surface} shadow-lg p-6`}>
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                        <FaShieldAlt className="h-5 w-5" />
                    </span>
                    <div className="space-y-1">
                        <div className={`h-3 w-16 rounded ${colors.skeleton} animate-pulse`} />
                        <div className={`h-5 w-24 rounded ${colors.skeleton} animate-pulse`} />
                    </div>
                </div>

                {/* Skeleton Nav Items */}
                <nav className="mt-8 flex flex-col gap-2">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2">
                            <div className={`h-9 w-9 rounded-full ${colors.skeleton} animate-pulse`} />
                            <div className={`h-4 w-32 rounded ${colors.skeleton} animate-pulse`} />
                        </div>
                    ))}
                </nav>

                {/* Skeleton Logout */}
                <div className="mt-auto pt-8">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className={`h-9 w-9 rounded-lg ${colors.logoutBg} animate-pulse`} />
                        <div className={`h-4 w-16 rounded ${colors.skeleton} animate-pulse`} />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 lg:pl-72 w-full">
                <main className="px-4 py-6 sm:px-6 lg:px-6 lg:py-8 w-full">
                    {/* Header Skeleton */}
                    <div className="mb-8 animate-pulse">
                        <div className={`h-8 w-64 rounded ${colors.skeleton} mb-2`} />
                        <div className={`h-4 w-96 rounded ${colors.skeleton}`} />
                    </div>

                    {/* Stat Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className={`animate-pulse rounded-xl border ${colors.border} ${colors.surface} p-6 shadow-md`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 space-y-2">
                                        <div className={`h-3 w-20 rounded ${colors.skeleton}`} />
                                        <div className={`h-8 w-16 rounded ${colors.skeleton}`} />
                                    </div>
                                    <div className={`h-10 w-10 rounded-lg ${colors.skeleton}`} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className={`animate-pulse rounded-xl border ${colors.border} ${colors.surface} p-6 shadow-md`}>
                            <div className={`h-6 w-48 rounded ${colors.skeleton} mb-4`} />
                            <div className={`h-64 rounded-lg ${colors.skeleton}`} />
                        </div>
                        <div className={`animate-pulse rounded-xl border ${colors.border} ${colors.surface} p-6 shadow-md`}>
                            <div className={`h-6 w-48 rounded ${colors.skeleton} mb-4`} />
                            <div className={`h-64 rounded-lg ${colors.skeleton}`} />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default AppLoader;
