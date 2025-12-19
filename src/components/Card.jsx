// src/components/Card.jsx
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
    // If accent is 'black', force black background for dark appearance
    if (accent === 'black') {
      return "bg-white [.dark_&]:bg-[#000000] [.dark_&]:border-gray-800";
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
