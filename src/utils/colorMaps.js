// Centralized color mappings for priorities and event types
// Provides both hex colors and Tailwind-friendly class bundles.

// Hex palettes
export const PRIORITY_HEX = {
  high: "#ef4444", // red-500
  medium: "#f59e0b", // amber-500
  low: "#10b981", // emerald-500
};

export const TYPE_HEX = {
  meeting: "#3b82f6", // blue-500
  task: "#10b981", // emerald-500
  milestone: "#8b5cf6", // violet-500
  call: "#f59e0b", // amber-500 (kept for consistency)
};

// Badge/bg/text class bundles
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
};

export const STATUS_BORDER_CLASSES = {
  approved: "border-l-4 border-green-500",
  pending: "border-l-4 border-amber-500",
  cancelled: "border-l-4 border-red-500",
  completed: "border-l-4 border-blue-500",
};

export const STATUS_CLASSES = {
  "to-do": {
    badge: "bg-gray-100 text-gray-700",
  },
  "in progress": {
    badge: "bg-blue-100 text-blue-700",
  },
  "in review": {
    badge: "bg-yellow-100 text-yellow-700",
  },
  done: {
    badge: "bg-green-100 text-green-700",
  },
};

export function normalizeKey(val) {
  return String(val || "")
    .trim()
    .toLowerCase();
}

export function getTypeHex(type) {
  return TYPE_HEX[normalizeKey(type)] || "#6b7280"; // gray-500
}

export function getPriorityHex(priority) {
  return PRIORITY_HEX[normalizeKey(priority)] || "#6b7280";
}

export function getTypeBadge(type) {
  const k = normalizeKey(type);
  return TYPE_CLASSES[k]?.badge || "bg-gray-100 text-gray-700";
}

export function getPriorityBadge(priority) {
  const k = normalizeKey(priority);
  return PRIORITY_CLASSES[k]?.badge || "bg-gray-100 text-gray-700";
}

export function getStatusBadge(status) {
  const k = normalizeKey(status);
  return STATUS_CLASSES[k]?.badge || "bg-gray-100 text-gray-700";
}
