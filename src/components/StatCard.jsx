/**
 * StatCard Component
 *
 * Purpose: Dashboard statistics card with icon, label, value.
 * Theme-aware with color variants for different metric types.
 *
 * Responsibilities:
 * - Display icon in colored circle
 * - Show label (uppercase tracking)
 * - Display main value (large, bold)
 * - Optional subValue for additional context
 *
 * Dependencies:
 * - useTheme for dark mode detection
 *
 * Props:
 * - icon: React element for card icon
 * - label: Metric label text
 * - value: Main metric value
 * - subValue: Optional secondary text
 * - color: Color variant (blue, green, indigo, sky, amber, purple, red, gray)
 *
 * Color Variants:
 * Each color has light mode and dark mode bg/icon classes.
 *
 * Last Modified: 2026-01-10
 */

import React from "react";
import { useTheme } from "../context/ThemeContext";

const StatCard = ({ icon, label, value, subValue, color = "indigo", variant = "soft" }) => {
  const { mode } = useTheme();

  // Color configurations for soft (pastel) and solid (gradient) variants
  const colors = {
    blue: {
      soft: {
        bg: "bg-blue-50 dark:bg-blue-500/10",
        icon: "text-blue-500 dark:text-blue-400",
      },
      solid: {
        bg: "bg-gradient-to-br from-blue-500 to-blue-600",
        icon: "text-white",
      },
    },
    green: {
      soft: {
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
        icon: "text-emerald-500 dark:text-emerald-400",
      },
      solid: {
        bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
        icon: "text-white",
      },
    },
    indigo: {
      soft: {
        bg: "bg-indigo-50 dark:bg-indigo-500/10",
        icon: "text-indigo-500 dark:text-indigo-400",
      },
      solid: {
        bg: "bg-gradient-to-br from-indigo-400 to-purple-500",
        icon: "text-white",
      },
    },
    sky: {
      soft: {
        bg: "bg-sky-50 dark:bg-sky-500/10",
        icon: "text-sky-500 dark:text-sky-400",
      },
      solid: {
        bg: "bg-gradient-to-br from-sky-500 to-sky-600",
        icon: "text-white",
      },
    },
    amber: {
      soft: {
        bg: "bg-amber-50 dark:bg-amber-500/10",
        icon: "text-amber-500 dark:text-amber-400",
      },
      solid: {
        bg: "bg-gradient-to-br from-amber-500 to-amber-600",
        icon: "text-white",
      },
    },
    purple: {
      soft: {
        bg: "bg-purple-50 dark:bg-purple-500/10",
        icon: "text-purple-500 dark:text-purple-400",
      },
      solid: {
        bg: "bg-gradient-to-br from-purple-500 to-purple-600",
        icon: "text-white",
      },
    },
    red: {
      soft: {
        bg: "bg-red-50 dark:bg-red-500/10",
        icon: "text-red-500 dark:text-red-400",
      },
      solid: {
        bg: "bg-gradient-to-br from-red-500 to-red-600",
        icon: "text-white",
      },
    },
    gray: {
      soft: {
        bg: "bg-gray-100 dark:bg-gray-500/10",
        icon: "text-gray-500 dark:text-gray-400",
      },
      solid: {
        bg: "bg-gradient-to-br from-gray-400 to-gray-500",
        icon: "text-white",
      },
    },
  };

  const colorConfig = (colors[color] || colors.indigo)[variant] || (colors[color] || colors.indigo).soft;

  return (
    <div
      className="rounded-xl border px-5 py-4 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white [.dark_&]:bg-[#1e1e2d] border-gray-200 [.dark_&]:border-gray-700"
    >
      <div className="flex items-center gap-4">
        {/* Icon Circle */}
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${colorConfig.bg} shadow-sm`}
        >
          <span className={colorConfig.icon}>
            {icon}
          </span>
        </div>

        {/* Text Content */}
        <div className="flex flex-col">
          <p
            className="text-xs font-semibold uppercase tracking-wider text-gray-700 [.dark_&]:text-gray-400"
          >
            {label}
          </p>
          <div
            className="text-2xl font-bold mt-0.5 text-gray-900 [.dark_&]:text-white"
          >
            {value}
          </div>
          {subValue && (
            <p
              className="text-xs font-medium mt-0.5 text-gray-600 [.dark_&]:text-gray-400"
            >
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
