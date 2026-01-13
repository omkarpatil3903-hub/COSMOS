/**
 * ColorSwatchPicker Component
 *
 * Purpose: Reusable color palette picker with optional custom color input.
 * Displays preset swatches in a grid with selection indicator.
 *
 * Responsibilities:
 * - Display grid of preset color swatches (8 columns)
 * - Highlight selected color with ring
 * - Optional eyedropper button for custom color picker
 * - Hidden color input for manual hex selection
 *
 * Props:
 * - value: Current selected hex color (e.g. #3b82f6)
 * - onSelect: Callback when a swatch is selected (receives hex)
 * - presetColors: Optional array of hex colors to display
 * - showManual: Whether to show the custom picker button (default: true)
 * - onManualPick: Optional custom picker handler
 * - className: Container class overrides
 *
 * Default Presets:
 * 16 Tailwind colors (blue, indigo, green, teal, purple, orange, red, etc.)
 *
 * Features:
 * - Accessible button labels and titles
 * - Focus ring on selection
 * - Hidden native color input for cross-browser support
 *
 * Last Modified: 2026-01-10
 */

import React, { useMemo, useRef } from "react";
import { FaEyeDropper } from "react-icons/fa";
export default function ColorSwatchPicker({
  value,
  onSelect,
  presetColors,
  showManual = true,
  onManualPick,
  className = "",
}) {
  const inputRef = useRef(null);

  const colors = useMemo(
    () =>
      presetColors && presetColors.length
        ? presetColors
        : [
          "#3b82f6", // blue-500
          "#6366f1", // indigo-500
          "#22c55e", // green-500
          "#10b981", // emerald-500
          "#14b8a6", // teal-500
          "#06b6d4", // cyan-500
          "#0ea5e9", // sky-500
          "#a855f7", // purple-500
          "#f97316", // orange-500
          "#ef4444", // red-500
          "#e11d48", // rose-600
          "#f59e0b", // amber-500
          "#84cc16", // lime-500
          "#10b981", // green-500 (dup for coverage)
          "#8b5cf6", // violet-500
          "#64748b", // slate-500
        ],
    [presetColors]
  );

  const handleManual = () => {
    if (onManualPick) return onManualPick();
    inputRef.current?.click();
  };

  return (
    <div className={`inline-block ${className}`}>
      <div className="grid grid-cols-8 gap-2 p-2">
        {colors.map((c, idx) => {
          const selected = (value || "").toLowerCase() === c.toLowerCase();
          return (
            <button
              key={`${c}-${idx}`}
              type="button"
              onClick={() => onSelect?.(c)}
              className={`h-6 w-6 rounded-md border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${selected ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                }`}
              style={{ backgroundColor: c }}
              title={c}
              aria-label={`Select ${c}`}
            />
          );
        })}
        {showManual && (
          <button
            type="button"
            onClick={handleManual}
            className="h-6 w-6 rounded-md border border-gray-300 bg-white flex items-center justify-center text-gray-500 hover:text-gray-700"
            title="Custom color"
            aria-label="Custom color"
          >
            <FaEyeDropper className="h-3 w-3" />
            <input
              ref={inputRef}
              type="color"
              className="sr-only"
              onChange={(e) => onSelect?.(e.target.value)}
            />
          </button>
        )}
      </div>
    </div>
  );
}
