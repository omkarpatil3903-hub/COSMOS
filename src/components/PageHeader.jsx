/**
 * PageHeader Component
 *
 * Purpose: Standard page header with title, description, and action buttons.
 * Provides consistent header styling across all pages.
 *
 * Responsibilities:
 * - Display page title with responsive sizing
 * - Optional description/children for page context
 * - Optional subtext for additional info
 * - Optional actions slot for buttons/controls
 *
 * Props:
 * - title: Page title (required)
 * - description: Description text (preferred over children)
 * - children: Alternative to description (fallback)
 * - subtext: Additional secondary text
 * - actions: React elements for header actions
 * - className: Additional classes for title
 *
 * Layout:
 * - Two-column on larger screens (title/description left, actions right)
 * - Stacked on mobile
 * - Bottom border separator
 *
 * Last Modified: 2026-01-10
 */

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
          <div className="text-sm text-content-secondary sm:text-base">
            {content}
          </div>
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
