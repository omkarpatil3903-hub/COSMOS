/**
 * Color Mapping Utilities
 *
 * Purpose: Centralized color definitions for priorities, event types,
 * and status indicators used throughout the application.
 *
 * Responsibilities:
 * - Provides hex color values for chart libraries (e.g., Gantt, Calendar)
 * - Provides Tailwind CSS class bundles for badges, dots, and borders
 * - Normalizes keys to handle case variations
 *
 * Dependencies:
 * - Tailwind CSS (all class strings are Tailwind utilities)
 *
 * Usage:
 * - Import hex values for chart libraries that need raw colors
 * - Import class getters for UI components using Tailwind
 *
 * Color Semantics:
 * - High priority / Urgent: Red
 * - Medium priority: Amber/Yellow
 * - Low priority: Green/Emerald
 * - Meeting type: Blue
 * - Task type: Green
 * - Milestone: Purple/Violet
 *
 * Last Modified: 2026-01-10
 */

// ============================================================================
// HEX COLOR PALETTES (for chart libraries)
// ============================================================================

// PRIORITY COLORS: Traffic light pattern (red → yellow → green)
// Used by: Gantt charts, priority indicators in visualizations
export const PRIORITY_HEX = {
  high: "#ef4444", // red-500
  medium: "#f59e0b", // amber-500
  low: "#10b981", // emerald-500
};

// EVENT TYPE COLORS: Distinct colors for calendar event categorization
export const TYPE_HEX = {
  meeting: "#3b82f6", // blue-500
  task: "#10b981", // emerald-500
  milestone: "#8b5cf6", // violet-500
  call: "#f59e0b", // amber-500
  recurring: "#181c1bff", // teal-500
};

// ============================================================================
// TAILWIND CLASS BUNDLES
// ============================================================================

// PRIORITY CLASSES: Badge, dot, and border variants for each priority level
export const PRIORITY_CLASSES = {
  high: {
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
    border: "border-red-500",
  },
  medium: {
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    border: "border-amber-500",
  },
  low: {
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-500",
    border: "border-green-500",
  },
};

// TYPE CLASSES: Badge, dot, and border variants for each event type
export const TYPE_CLASSES = {
  meeting: {
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
    border: "border-blue-500",
  },
  task: {
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-500",
    border: "border-green-500",
  },
  milestone: {
    badge: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
    border: "border-purple-500",
  },
  call: {
    badge: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
    border: "border-yellow-500",
  },
  recurring: {
    badge: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500",
    border: "border-teal-500",
  },
};

// STATUS BORDER CLASSES: Left border accent for status indication
export const STATUS_BORDER_CLASSES = {
  approved: "border-l-4 border-green-500",
  pending: "border-l-4 border-amber-500",
  cancelled: "border-l-4 border-red-500",
  completed: "border-l-4 border-blue-500",
};

// TASK STATUS CLASSES: Badge variants for task statuses
export const STATUS_CLASSES = {
  "to-do": {
    badge: "bg-gray-100 text-gray-700",
  },
  "in progress": {
    badge: "bg-blue-100 text-blue-700",
  },
  done: {
    badge: "bg-green-100 text-green-700",
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes a key for consistent lookup.
 * Handles null/undefined and trims whitespace.
 *
 * @param {string|null} val - Value to normalize
 * @returns {string} Lowercase, trimmed string
 */
export function normalizeKey(val) {
  return String(val || "")
    .trim()
    .toLowerCase();
}

/**
 * Get hex color for event type.
 * @param {string} type - Event type
 * @returns {string} Hex color code (defaults to gray-500)
 */
export function getTypeHex(type) {
  return TYPE_HEX[normalizeKey(type)] || "#6b7280"; // gray-500 fallback
}

/**
 * Get hex color for priority level.
 * @param {string} priority - Priority level
 * @returns {string} Hex color code
 */
export function getPriorityHex(priority) {
  return PRIORITY_HEX[normalizeKey(priority)] || "#6b7280";
}

/**
 * Get badge class for event type.
 * @param {string} type - Event type
 * @returns {string} Tailwind CSS class string
 */
export function getTypeBadge(type) {
  const k = normalizeKey(type);
  return TYPE_CLASSES[k]?.badge || "bg-gray-100 text-gray-700";
}

/**
 * Get badge class for priority level.
 * @param {string} priority - Priority level
 * @returns {string} Tailwind CSS class string
 */
export function getPriorityBadge(priority) {
  const k = normalizeKey(priority);
  return PRIORITY_CLASSES[k]?.badge || "bg-gray-100 text-gray-700";
}

/**
 * Get badge class for task status.
 * @param {string} status - Task status
 * @returns {string} Tailwind CSS class string
 */
export function getStatusBadge(status) {
  const k = normalizeKey(status);
  return STATUS_CLASSES[k]?.badge || "bg-gray-100 text-gray-700";
}

// GANTT CHART: Hex colors for task status visualization
export const STATUS_HEX = {
  "to-do": "#9ca3af", // gray-400
  "in progress": "#3b82f6", // blue-500
  done: "#10b981", // green-500
};
