/**
 * SkeletonRow Component
 *
 * Purpose: Table row skeleton for loading states.
 * Displays animated placeholder cells while data loads.
 *
 * Responsibilities:
 * - Render specified number of skeleton cells
 * - Apply pulse animation for loading effect
 *
 * Props:
 * - columns: Number of cells to render
 *
 * Last Modified: 2026-01-10
 */

import React from "react";
function SkeletonRow({ columns }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="py-4 px-4 whitespace-nowrap">
          <div className="h-4 rounded-md bg-surface-strong"></div>
        </td>
      ))}
    </tr>
  );
}

export default SkeletonRow;
