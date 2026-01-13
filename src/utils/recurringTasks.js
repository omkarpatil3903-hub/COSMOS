/**
 * Recurring Tasks Utilities
 *
 * Purpose: Handles all recurring task logic including date calculations,
 * occurrence checking, and automatic instance creation.
 *
 * Responsibilities:
 * - Calculate next due dates based on recurrence patterns
 * - Check if a task occurs on a specific date (for calendar display)
 * - Expand recurring tasks into individual occurrences for date ranges
 * - Create next task instances when recurring tasks are completed
 * - Process all completed recurring tasks (batch operation)
 *
 * Dependencies:
 * - Firestore (tasks collection)
 *
 * Recurrence Patterns:
 * - daily: Every N days
 * - weekly: Every N weeks (same day of week)
 * - monthly: Every N months (same day of month)
 * - yearly: Every N years (same date)
 *
 * End Conditions:
 * - never: Recurs indefinitely
 * - date: Recurs until specific date
 * - after: Recurs for N occurrences
 *
 * Data Model:
 * - isRecurring: boolean flag
 * - recurringPattern: 'daily' | 'weekly' | 'monthly' | 'yearly'
 * - recurringInterval: number (e.g., 2 = every 2 weeks)
 * - recurringEndType: 'never' | 'date' | 'after'
 * - recurringEndDate: Date (if endType is 'date')
 * - recurringEndAfter: number (if endType is 'after')
 * - parentRecurringTaskId: ID of the root task in the series
 * - recurringOccurrenceCount: current occurrence number
 * - skipWeekends: boolean (skip weekends for business tasks)
 *
 * Last Modified: 2026-01-10
 */

import { addDoc, collection, query, where, getDocs, runTransaction, doc } from "firebase/firestore";
import { db } from "../firebase";

// ============================================================================
// DATE CALCULATIONS
// ============================================================================

/**
 * Calculate the next due date based on recurring pattern.
 *
 * @param {Date|Timestamp|string} currentDueDate - Current due date
 * @param {string} pattern - Recurrence pattern (daily, weekly, monthly, yearly)
 * @param {number} interval - Interval between occurrences
 * @param {boolean} skipWeekends - Whether to skip Saturday/Sunday
 * @returns {string} Next due date in YYYY-MM-DD format
 *
 * Business Logic:
 * - Handles Firestore Timestamps, Date objects, and date strings
 * - If skipWeekends is enabled, moves Saturday to Monday (+2 days)
 * - If skipWeekends is enabled, moves Sunday to Monday (+1 day)
 */
export function calculateNextDueDate(
  currentDueDate,
  pattern,
  interval,
  skipWeekends = false
) {
  // NORMALIZE: Convert various date formats to JavaScript Date
  let date;
  if (currentDueDate?.toDate) {
    date = currentDueDate.toDate();
  } else if (currentDueDate?.seconds) {
    date = new Date(currentDueDate.seconds * 1000);
  } else {
    date = new Date(currentDueDate);
  }

  // CALCULATE: Apply pattern-specific increment
  switch (pattern) {
    case "daily":
      date.setDate(date.getDate() + interval);
      break;
    case "weekly":
      date.setDate(date.getDate() + interval * 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + interval);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + interval);
      break;
    default:
      // FALLBACK: Treat unknown patterns as daily
      date.setDate(date.getDate() + interval);
  }

  // WEEKEND SKIP: Move to Monday if landing on weekend
  if (skipWeekends) {
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

// ============================================================================
// OCCURRENCE CHECKING (for calendar display)
// ============================================================================

/**
 * Check if a recurring task occurs on a specific date.
 * Used for calendar grid to show recurring task indicators.
 *
 * @param {object} task - Task object with recurrence settings
 * @param {Date} date - Date to check
 * @returns {boolean} True if task occurs on this date
 *
 * Business Logic:
 * - Non-recurring tasks only match their exact due date
 * - Respects skipWeekends setting
 * - Respects end date/occurrence limits
 */
export function occursOnDate(task, date) {
  const base = task?.dueDate?.toDate?.()
    ? task.dueDate.toDate()
    : new Date(task.dueDate);
  if (!(base instanceof Date) || Number.isNaN(base.getTime())) return false;

  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate());

  // WEEKEND SKIP: Never occurs on weekends if skipWeekends is enabled
  if (task?.skipWeekends && (d.getDay() === 0 || d.getDay() === 6))
    return false;

  const endType = task.recurringEndType;
  const interval = Number(task.recurringInterval || 1);

  // NON-RECURRING: Simple date match
  if (!task.isRecurring) {
    return d.getTime() === b.getTime();
  }

  // END DATE CHECK: Stop checking after end date
  if (endType === "date" && task.recurringEndDate) {
    const end = new Date(task.recurringEndDate);
    if (d > end) return false;
  }

  const diffDays = Math.floor((d - b) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return false; // Before start date

  const pattern = task.recurringPattern || "daily";

  // PATTERN MATCHING: Check if date falls on recurrence
  if (pattern === "daily") {
    return diffDays % interval === 0;
  }
  if (pattern === "weekly") {
    if (d.getDay() !== b.getDay()) return false; // Must be same day of week
    const weeks = Math.floor(diffDays / 7);
    return weeks % interval === 0;
  }
  if (pattern === "monthly") {
    if (d.getDate() !== b.getDate()) return false; // Must be same day of month
    const months =
      (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
    return months % interval === 0;
  }
  if (pattern === "yearly") {
    if (d.getDate() !== b.getDate() || d.getMonth() !== b.getMonth())
      return false; // Must be same month and day
    const years = d.getFullYear() - b.getFullYear();
    return years % interval === 0;
  }

  return false;
}

/**
 * Expand a recurring task into individual occurrence dates within a range.
 * Used for calendar views to show all occurrences.
 *
 * @param {object} task - Task object with recurrence settings
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {Array<string>} Array of date strings (YYYY-MM-DD)
 */
export function expandRecurringOccurrences(task, startDate, endDate) {
  const dates = [];
  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const end = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );

  // ITERATE: Check each day in range
  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    if (occursOnDate(task, dt)) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
    }
  }
  return dates;
}

// ============================================================================
// NEXT INSTANCE CREATION
// ============================================================================

/**
 * Check if we should create the next instance of a recurring task.
 * Synchronous version (uses in-memory occurrence count).
 *
 * @param {object} task - Completed recurring task
 * @returns {boolean} True if next instance should be created
 *
 * Business Rules:
 * - Task must be recurring and completed (status = "Done")
 * - Task must have completedAt timestamp
 * - Must not exceed end date or max occurrences
 */
export function shouldCreateNextInstance(task) {
  if (!task.isRecurring) return false;
  if (task.status !== "Done") return false;
  if (!task.completedAt) return false;

  const dueDate = new Date(task.dueDate);

  // END DATE CHECK: Don't create if past end date
  if (task.recurringEndType === "date" && task.recurringEndDate) {
    const endDate = new Date(task.recurringEndDate);
    if (dueDate >= endDate) return false;
  }

  // OCCURRENCE LIMIT CHECK: Don't create if max reached
  if (task.recurringEndType === "after" && task.recurringEndAfter) {
    const maxOccurrences = parseInt(task.recurringEndAfter);
    if (task.recurringOccurrenceCount >= maxOccurrences) return false;
  }

  return true;
}

/**
 * Count existing occurrences for a recurring task series.
 * Used to enforce "ends after N occurrences" limit.
 *
 * @param {string} seriesId - Parent recurring task ID
 * @returns {Promise<number>} Total occurrences (children + root)
 */
export async function countSeriesOccurrences(seriesId) {
  if (!seriesId) return 0;
  const q = query(
    collection(db, "tasks"),
    where("parentRecurringTaskId", "==", seriesId)
  );
  const snap = await getDocs(q);
  // TOTAL: Children count + 1 (the root task itself)
  return (snap?.size || 0) + 1;
}

/**
 * Async variant of shouldCreateNextInstance.
 * Queries Firestore to accurately count existing occurrences.
 *
 * @param {object} task - Completed recurring task
 * @returns {Promise<boolean>} True if next instance should be created
 */
export async function shouldCreateNextInstanceAsync(task) {
  if (!task?.isRecurring) return false;
  if (task.status !== "Done") return false;
  if (!task.completedAt) return false;

  const dueDate = new Date(task.dueDate);

  if (task.recurringEndType === "date" && task.recurringEndDate) {
    const endDate = new Date(task.recurringEndDate);
    if (dueDate >= endDate) return false;
  }

  if (task.recurringEndType === "after" && task.recurringEndAfter) {
    const maxOccurrences = parseInt(task.recurringEndAfter);
    const seriesId = task.parentRecurringTaskId || task.id;
    const count = await countSeriesOccurrences(seriesId);
    if (count >= maxOccurrences) return false;
  }
  return true;
}

/**
 * Create the next instance of a recurring task.
 * Uses Firestore transaction to prevent duplicate creation.
 *
 * @param {object} task - Completed recurring task
 * @returns {Promise<string|null>} New task ID or null if already exists
 *
 * Business Logic:
 * - Calculates next due date based on pattern
 * - Checks if instance already exists for that date (prevents duplicates)
 * - Creates new task with reset status and progress
 * - Links to parent via parentRecurringTaskId
 *
 * IMPORTANT: Uses transaction to prevent race conditions when multiple
 * clients may complete the same task simultaneously.
 */
export async function createNextRecurringInstance(task) {
  try {
    // Calculate next due date
    const nextDueDate = calculateNextDueDate(
      task.dueDate,
      task.recurringPattern,
      task.recurringInterval,
      task.skipWeekends
    );

    const seriesId = task.parentRecurringTaskId || task.id;

    // TRANSACTION: Atomic check-and-create to prevent duplicates
    return await runTransaction(db, async (transaction) => {
      console.log("Starting transaction for recurring task", seriesId, nextDueDate);

      // STEP 1: Check if instance already exists for this date
      const existingQuery = query(
        collection(db, "tasks"),
        where("parentRecurringTaskId", "==", seriesId),
        where("dueDate", "==", nextDueDate)
      );

      const existingDocs = await getDocs(existingQuery);

      if (!existingDocs.empty) {
        console.log("Instance already exists for", nextDueDate);
        return null; // ABORT: Instance already exists
      }

      console.log("No existing instance found. Creating new task...");

      // STEP 2: Build new task data (reset progress, keep recurrence settings)
      const { id, ...restOfTask } = task;
      const newTaskData = {
        title: restOfTask.title,
        description: restOfTask.description,
        assigneeId: restOfTask.assigneeId,
        assigneeType: restOfTask.assigneeType,
        assigneeIds: restOfTask.assigneeIds || [],
        assignees: restOfTask.assignees || [],
        projectId: restOfTask.projectId,
        assignedDate: new Date().toISOString().slice(0, 10),
        dueDate: nextDueDate,
        visibleFrom: new Date().toISOString().slice(0, 10), // VISIBLE IMMEDIATELY: Employees can see upcoming tasks
        priority: restOfTask.priority,
        status: "To-Do", // RESET: New instance starts as To-Do
        progressPercent: 0,
        createdAt: new Date(),
        completedAt: null,
        archived: false,
        completionComment: "",
        assigneeStatus: {}, // RESET: Clear individual assignee progress
        weightage: restOfTask.weightage,
        // INHERIT: Keep recurrence settings
        isRecurring: restOfTask.isRecurring,
        recurringPattern: restOfTask.recurringPattern,
        recurringInterval: restOfTask.recurringInterval,
        recurringEndDate: restOfTask.recurringEndDate,
        recurringEndAfter: restOfTask.recurringEndAfter,
        recurringEndType: restOfTask.recurringEndType,
        parentRecurringTaskId: seriesId, // LINK: Connect to series
        recurringOccurrenceCount: (restOfTask.recurringOccurrenceCount || 0) + 1,
      };

      // STEP 3: Create new task document
      const newDocRef = doc(collection(db, "tasks"));
      newTaskData.taskId = newDocRef.id;
      transaction.set(newDocRef, newTaskData);

      console.log("Transaction set called for new task", newDocRef.id);
      return newDocRef.id;
    });

  } catch (error) {
    console.error("Error creating recurring task instance:", error);
    throw error;
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process all completed recurring tasks and create next instances.
 * Intended for periodic execution (e.g., daily cron job or Cloud Function).
 *
 * @returns {Promise<Array>} Results array with success/failure for each task
 *
 * @example
 * // Run daily via Cloud Scheduler
 * const results = await processRecurringTasks();
 * console.log(`Created ${results.filter(r => r.success).length} new instances`);
 */
export async function processRecurringTasks() {
  try {
    // QUERY: Find all completed recurring tasks
    const recurringQuery = query(
      collection(db, "tasks"),
      where("isRecurring", "==", true),
      where("status", "==", "Done")
    );

    const snapshot = await getDocs(recurringQuery);
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // NORMALIZE: Convert Firestore timestamps
      dueDate: doc.data().dueDate?.toDate
        ? doc.data().dueDate.toDate().toISOString().slice(0, 10)
        : doc.data().dueDate,
      completedAt: doc.data().completedAt?.toDate
        ? doc.data().completedAt.toDate()
        : doc.data().completedAt,
    }));

    const results = [];

    // PROCESS: Create next instance for eligible tasks
    for (const task of tasks) {
      if (shouldCreateNextInstance(task)) {
        try {
          const newId = await createNextRecurringInstance(task);
          if (newId) {
            results.push({
              taskId: task.id,
              newInstanceId: newId,
              success: true,
            });
          }
        } catch (error) {
          results.push({
            taskId: task.id,
            success: false,
            error: error.message,
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error processing recurring tasks:", error);
    throw error;
  }
}
