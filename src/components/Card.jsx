/**
 * Card Component
 *
 * Purpose: Theme-aware card container with optional header.
 * Provides consistent card styling across the application.
 *
 * Responsibilities:
 * - Render card with rounded corners, border, shadow
 * - Display optional header with title, icon, and actions
 * - Apply tone-based background colors
 * - Special handling for 'black' accent theme
 *
 * Dependencies:
 * - useTheme context for accent color
 *
 * Props:
 * - title: Optional card title
 * - icon: Optional React element for header icon
 * - children: Card body content
 * - actions: Optional React element for header actions
 * - className: Additional classes
 * - tone: 'surface' | 'strong' | 'muted' | 'white'
 *
 * Tone Colors:
 * - surface/strong: bg-surface-strong
 * - muted: bg-surface-subtle
 * - white: bg-white (dark: bg-surface-strong)
 * - Black accent: special grey background for dark mode
 *
 * Last Modified: 2026-01-10
 */

import React from "react";
import { useTheme } from "../context/ThemeContext";

function Card({ title, icon, children, actions, className = "", tone = "surface", ...props }) {
  const iconEl =
    icon && React.isValidElement(icon)
      ? React.cloneElement(icon, {
        className: `h-4 w-4 text-content-secondary ${icon.props.className || ""
          }`.trim(),
      })
      : icon;
  // Use theme-surface classes so dark mode automatically applies the shared card background.
  // "surface" -> generic surface, "strong" -> card emphasis (default), "muted" / "white" for special cases.
  const { accent } = useTheme();

  const getToneClass = () => {
    // If accent is 'black', use grey background for dark mode to match stat cards
    if (accent === 'black') {
      return "bg-white [.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10";
    }

    return tone === "white"
      ? "bg-white dark:bg-surface-strong"
      : tone === "muted"
        ? "bg-surface-subtle"
        : tone === "surface"
          ? "bg-surface-strong"
          : "bg-surface-strong";
  };

  const toneClass = getToneClass();

  return (
    <div
      {...props}
      className={`${toneClass} rounded-xl border border-subtle shadow-soft transition-colors duration-200 max-w-full overflow-hidden ${className}`}
    >
      {/* Card Header */}
      {(title || icon || actions) && (
        <div className="flex flex-col gap-3 border-b border-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          {(title || icon) && (
            <div className="flex items-center gap-2">
              {iconEl}
              {title && (
                <h2 className="text-lg font-semibold text-content-primary">
                  {title}
                </h2>
              )}
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Card Body */}
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

export default Card;
