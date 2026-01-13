/**
 * Spinner Component
 *
 * Purpose: Simple loading spinner for async operations.
 * Centered spinning border animation.
 *
 * Responsibilities:
 * - Display centered spinning indicator
 * - Used during auth checks, data loading
 *
 * Styling:
 * - Indigo border with transparent fill
 * - Spin animation
 * - Centered with padding
 *
 * Last Modified: 2026-01-10
 */

import React from "react";

function Spinner() {
  return (
    <div className="flex items-center justify-center p-10">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
    </div>
  );
}

export default Spinner;
