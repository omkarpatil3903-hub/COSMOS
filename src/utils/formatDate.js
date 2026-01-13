/**
 * Format Date Utility - Legacy Date Formatter
 *
 * Purpose: Converts various date formats to DD/MM/YYYY display format.
 *
 * Responsibilities:
 * - Handles Firestore Timestamps (toDate method)
 * - Handles JavaScript Date objects
 * - Handles Unix timestamps (milliseconds)
 * - Handles ISO date strings
 *
 * Dependencies: None (pure JavaScript)
 *
 * Output Format: DD/MM/YYYY (Indian/European format)
 *
 * NOTE: This is a legacy utility. For new code, consider using
 * dateUtils.js which has more comprehensive date handling.
 *
 * Last Modified: 2026-01-10
 */

/**
 * Format a date value to DD/MM/YYYY string.
 *
 * @param {Date|Timestamp|number|string} dateString - Date in any supported format
 * @returns {string} Formatted date string (DD/MM/YYYY) or "-" if invalid
 *
 * Supported Input Formats:
 * - Firestore Timestamp: { toDate: () => Date }
 * - JavaScript Date object
 * - Unix timestamp in milliseconds
 * - ISO date string (YYYY-MM-DD)
 *
 * @example
 * formatDate(new Date()) // "10/01/2026"
 * formatDate("2026-01-10") // "10/01/2026"
 * formatDate(null) // "-"
 */
export const formatDate = (dateString) => {
  // Handle null/undefined gracefully
  if (!dateString) return "-";

  // Convert to string if it's a Date object or timestamp
  let dateStr = dateString;

  // FIRESTORE TIMESTAMP: Has toDate() method
  if (dateString && typeof dateString === 'object' && typeof dateString.toDate === 'function') {
    dateStr = dateString.toDate().toISOString().split('T')[0];
  }
  // JAVASCRIPT DATE: Native Date object
  else if (dateString instanceof Date) {
    dateStr = dateString.toISOString().split('T')[0];
  }
  // UNIX TIMESTAMP: Number in milliseconds
  else if (typeof dateString === 'number') {
    dateStr = new Date(dateString).toISOString().split('T')[0];
  }
  // UNKNOWN TYPE: Attempt string conversion
  else if (typeof dateString !== 'string') {
    dateStr = String(dateString);
  }

  // REFORMAT: Convert YYYY-MM-DD to DD/MM/YYYY
  // Only process if it matches the expected format
  if (dateStr.includes("-")) {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  // FALLBACK: Return as-is if format not recognized
  return dateStr;
};