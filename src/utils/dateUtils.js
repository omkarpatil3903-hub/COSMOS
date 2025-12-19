/**
 * Date Utilities for Calendar System
 * Handles all date conversions, formatting, and calculations
 */

/**
 * Convert Firestore timestamp to JavaScript Date
 * @param {*} value - Firestore timestamp or date string
 * @returns {Date|null}
 */
export const tsToDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Convert Date to input value format (YYYY-MM-DD)
 * @param {Date} date
 * @returns {string}
 */
export const dateToInputValue = (date) => {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Get time ago string (e.g., "5m ago", "2h ago")
 * @param {Date} date
 * @returns {string}
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
 * Check if two dates are the same day
 * @param {Date} date1
 * @param {Date} date2
 * @returns {boolean}
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
 * Check if date is today
 * @param {Date} date
 * @returns {boolean}
 */
export const isToday = (date) => {
  return isSameDay(date, new Date());
};

/**
 * Check if date is in the past
 * @param {Date} date
 * @returns {boolean}
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
 * Get days in month
 * @param {number} year
 * @param {number} month (0-11)
 * @returns {number}
 */
export const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Get first day of month (0-6, Sunday-Saturday)
 * @param {number} year
 * @param {number} month (0-11)
 * @returns {number}
 */
export const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

/**
 * Format date for display
 * @param {Date|string} date
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
export const formatDate = (date, options = {}) => {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", options);
};

/**
 * Get date range for calendar view
 * @param {Date} currentDate
 * @returns {Array<Date>}
 */
export const getCalendarDates = (currentDate) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  const dates = [];

  // Previous month days
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    dates.push(new Date(year, month - 1, prevMonthDays - i));
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(new Date(year, month, i));
  }

  // Next month days to fill grid
  const remainingDays = 42 - dates.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    dates.push(new Date(year, month + 1, i));
  }

  return dates;
};

/**
 * Month names
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
 * Day names
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
 * Get days until deadline
 * @param {Date|string} deadline
 * @returns {number}
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

/**
 * Format date to DD/MM/YYYY format
 * @param {Date|object} date - Date object or Firestore timestamp
 * @returns {string}
 */
export const formatDateToDDMMYYYY = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : date?.toDate?.() || new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};
