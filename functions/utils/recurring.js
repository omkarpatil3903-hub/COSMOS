const admin = require("firebase-admin");

/**
 * Calculate the next due date based on recurring pattern
 * @param {string} currentDueDate - YYYY-MM-DD
 * @param {string} pattern - daily, weekly, monthly, yearly
 * @param {number} interval - step size
 * @param {boolean} skipWeekends - whether to skip Sat/Sun (legacy, kept for backward compatibility)
 * @param {array} selectedWeekDays - array of day indices [0-6] where task should recur (0=Sun, 6=Sat)
 * @returns {string} Next due date in YYYY-MM-DD
 */
function calculateNextDueDate(currentDueDate, pattern, interval, skipWeekends = false, selectedWeekDays = null) {
  const date = new Date(currentDueDate);
  const intVal = parseInt(interval) || 1;

  switch (pattern) {
    case "daily":
      date.setDate(date.getDate() + intVal);
      break;
    case "weekly":
      date.setDate(date.getDate() + intVal * 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + intVal);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + intVal);
      break;
    default:
      date.setDate(date.getDate() + intVal);
  }

  // CUSTOM WORKING DAYS: If selectedWeekDays is provided, skip non-working days
  if (selectedWeekDays && Array.isArray(selectedWeekDays) && selectedWeekDays.length > 0) {
    let attempts = 0;
    const maxAttempts = 14; // Prevent infinite loops

    while (attempts < maxAttempts && !selectedWeekDays.includes(date.getDay())) {
      date.setDate(date.getDate() + 1);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.warn(`Could not find valid working day for task. Using calculated date anyway.`);
    }
  }
  // LEGACY: If skipWeekends is enabled (backward compatibility)
  else if (skipWeekends) {
    const day = date.getDay();
    if (day === 6) {
      // Saturday → Monday
      date.setDate(date.getDate() + 2);
    } else if (day === 0) {
      // Sunday → Monday
      date.setDate(date.getDate() + 1);
    }
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Check if we should create the next instance of a recurring task
 * @param {object} task - The task document data
 * @returns {boolean}
 */
function shouldCreateNextInstance(task) {
  if (!task.isRecurring) return false;
  if (task.status !== "Done") return false;

  const dueDate = new Date(task.dueDate);

  // Check if current task is completed (sanity check, though status is Done)
  if (!task.completedAt) return false;

  // Check end conditions
  if (task.recurringEndType === "date" && task.recurringEndDate) {
    const endDate = new Date(task.recurringEndDate);
    if (dueDate >= endDate) return false;
  }

  // Note: 'after' occurrences check requires async DB lookup, 
  // so we'll handle that in the main processing loop or an async wrapper.
  // This function just checks static properties.

  return true;
}

/**
 * Count existing occurrences for a series by parentRecurringTaskId.
 * @param {string} seriesId 
 * @returns {Promise<number>}
 */
async function countSeriesOccurrences(seriesId) {
  if (!seriesId) return 0;
  const snapshot = await admin.firestore()
    .collection("tasks")
    .where("parentRecurringTaskId", "==", seriesId)
    .get();

  // children + root (if root doesn't have parentRecurringTaskId, it won't be in this query, 
  // but usually we count the series size. 
  // If the root IS the seriesId, we add 1 for the root itself.)
  return snapshot.size + 1;
}

module.exports = {
  calculateNextDueDate,
  shouldCreateNextInstance,
  countSeriesOccurrences
};
