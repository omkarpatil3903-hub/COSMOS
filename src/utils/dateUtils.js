/**
 * Date Utilities for Calendar System
 *
 * Purpose: Comprehensive date handling utilities for the calendar and task
 * management system, including conversions, formatting, and calculations.
 *
 * Responsibilities:
 * - Firestore Timestamp to JavaScript Date conversion
 * - Date formatting for display and input fields
 * - Relative time calculations ("5m ago", "2h ago")
 * - Calendar grid generation
 * - Date comparison utilities
 *
 * Dependencies: None (pure JavaScript)
 *
 * Timezone Handling:
 * All date operations use local timezone. For cross-timezone applications,
 * consider using UTC or a library like date-fns or luxon.
 *
 * Last Modified: 2026-01-10
 */

/**
 * Convert Firestore timestamp to JavaScript Date.
 * Handles multiple input formats gracefully.
 *
 * @param {Timestamp|Date|string|object|null} value - Firestore timestamp, Date, or date string
 * @returns {Date|null} JavaScript Date or null if invalid
 *
 * Supported Formats:
 * - Firestore Timestamp: { toDate: () => Date }
 * - Firestore-like object: { seconds: number }
 * - JavaScript Date object
 * - ISO date string
 */
export const tsToDate = (value) => {
  if (!value) return null;
  // FIRESTORE TIMESTAMP: Has toDate() method
  if (typeof value.toDate === "function") return value.toDate();
  // FIRESTORE-LIKE: Has seconds property (manual timestamp construction)
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  // STRING/DATE: Try native parsing
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Convert Date to HTML input value format (YYYY-MM-DD).
 * Compatible with <input type="date" value={...} />
 *
 * @param {Date} date - Date to convert
 * @returns {string} Date string in YYYY-MM-DD format or empty string
 */
export const dateToInputValue = (date) => {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Get human-readable relative time string.
 *
 * @param {Date} date - Date to compare against now
 * @returns {string} Relative time (e.g., "Just now", "5m ago", "2h ago", "3d ago")
 */
export const getTimeAgo = (date) => {
  if (!date) return "";
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

/**
 * Check if two dates are the same calendar day.
 * Ignores time components.
 *
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same year, month, and day
 */
export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Check if date is today.
 *
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  return isSameDay(date, new Date());
};

/**
 * Check if date is in the past (before today).
 * Compares at day level, not time level.
 *
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is before today
 */
export const isPast = (date) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
};

/**
 * Get number of days in a specific month.
 *
 * @param {number} year - Full year (e.g., 2026)
 * @param {number} month - Month index (0-11, where 0 = January)
 * @returns {number} Number of days in the month (28-31)
 */
export const getDaysInMonth = (year, month) => {
  // TRICK: Day 0 of next month = last day of current month
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Get day of week for first day of month.
 *
 * @param {number} year - Full year
 * @param {number} month - Month index (0-11)
 * @returns {number} Day of week (0-6, where 0 = Sunday)
 */
export const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

/**
 * Format date for display using Intl.DateTimeFormat.
 *
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 *
 * @example
 * formatDate(new Date(), { month: 'short', day: 'numeric' }) // "Jan 10"
 */
export const formatDate = (date, options = {}) => {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", options);
};

/**
 * Generate array of dates for calendar grid display.
 * Includes days from previous/next months to fill 6-week grid.
 *
 * @param {Date} currentDate - Any date in the target month
 * @returns {Array<Date>} Array of 42 dates (6 weeks × 7 days)
 *
 * Business Logic:
 * - Starts with days from previous month to align with week start
 * - Includes all days of current month
 * - Fills remaining cells with next month's days
 * - Always returns 42 dates for consistent grid layout
 */
export const getCalendarDates = (currentDate) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  const dates = [];

  // PREVIOUS MONTH: Fill leading days to align week start
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    dates.push(new Date(year, month - 1, prevMonthDays - i));
  }

  // CURRENT MONTH: All days of target month
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(new Date(year, month, i));
  }

  // NEXT MONTH: Fill to complete 6-week grid (42 cells)
  const remainingDays = 42 - dates.length;
  for (let i = 1; i <= remainingDays; i++) {
    dates.push(new Date(year, month + 1, i));
  }

  return dates;
};

/**
 * Month names for display.
 */
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Day names for calendar headers.
 */
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Calculate days until a deadline.
 *
 * @param {Date|string} deadline - Target deadline date
 * @returns {number} Days remaining (negative if past, Infinity if no deadline)
 *
 * @example
 * getDaysUntil("2026-01-15") // 5 (if today is Jan 10)
 * getDaysUntil("2026-01-05") // -5 (if today is Jan 10)
 */
export const getDaysUntil = (deadline) => {
  if (!deadline) return Infinity;
  const deadlineDate =
    typeof deadline === "string" ? new Date(deadline) : deadline;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diff = deadlineDate - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
