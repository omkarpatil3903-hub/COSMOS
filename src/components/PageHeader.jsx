// src/components/PageHeader.jsx
import React from "react";

function PageHeader({ title, description, children, actions, subtext, className }) {
  // Prefer explicit `description` prop, fall back to children for older pages
  const content = description ?? children;

  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-subtle pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-2xl space-y-2">
        <h1 className={`text-2xl font-semibold text-content-primary sm:text-3xl ${className || ''}`}>
          {title}
        </h1>
        {content && (
          <p className="text-sm text-content-secondary sm:text-base">
            {content}
          </p>
        )}
        {subtext && (
          <p className="text-sm text-content-secondary sm:text-base">
            {subtext}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export default PageHeader;
