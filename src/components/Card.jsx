// src/components/Card.jsx
import React from "react";

function Card({ title, children, actions, className = "", ...props }) {
  return (
    <div
      {...props}
      className={`bg-surface rounded-xl border border-subtle shadow-soft transition-colors duration-200 ${className}`}
    >
      {/* Card Header */}
      {(title || actions) && (
        <div className="flex flex-col gap-3 border-b border-subtle px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          {title && (
            <h2 className="text-lg font-semibold text-content-primary">
              {title}
            </h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Card Body */}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default Card;
