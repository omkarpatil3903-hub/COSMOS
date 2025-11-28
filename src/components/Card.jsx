// src/components/Card.jsx
import React from "react";

function Card({ title, icon, children, actions, className = "", tone = "surface", ...props }) {
  const iconEl =
    icon && React.isValidElement(icon)
      ? React.cloneElement(icon, {
          className: `h-4 w-4 text-content-secondary ${
            icon.props.className || ""
          }`.trim(),
        })
      : icon;
  const toneClass = tone === "white" ? "bg-white" : tone === "muted" ? "bg-gray-50" : "bg-surface";

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
