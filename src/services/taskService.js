/**
 * Task Service - Task & Subtask Management Operations
 *
 * Purpose: Comprehensive service for all task-related Firestore operations
 * including tasks, subtasks, comments, activities, and time tracking.
 *
 * Responsibilities:
 * - Task CRUD operations with real-time subscriptions
 * - Subtask management (add, update, toggle, delete) with dependency checking
 * - Comments and activity logging for audit trails
 * - Time tracking start/stop with validation
 * - Cascading delete for tasks with subcollections
 *
 * Dependencies:
 * - Firestore (tasks collection, comments/activities subcollections)
 * - dateUtils (tsToDate for Timestamp conversion)
 *
 * Task Statuses: To-Do, In-Progress, Done
 * Task Priorities: Low, Medium, High
 *
 * Subcollections:
 * - comments: User comments on tasks
 * - activities: Audit log of all task changes
 *
 * Data Model Notes:
 * - assigneeStatus: Map of user ID → { isTracking, trackingStartTime, timeSpent }
 * - subtasks: Array of subtask objects (not subcollection for atomic updates)
 *
 * Last Modified: 2026-01-30
 */

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  arrayUnion,
  limit,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebase";
import { tsToDate } from "../utils/dateUtils";
import { shouldCreateNextInstanceAsync, createNextRecurringInstance } from "../utils/recurringTasks";

// ============================================================================
// TASK CRUD OPERATIONS
// ============================================================================

/**
 * Subscribe to tasks collection for real-time updates.
 *
 * @param {function} callback - Called with tasks array whenever data changes
 * @param {number} limitCount - Maximum tasks to fetch (default: 50)
 * @returns {function} Unsubscribe function
 *
 * Business Logic:
 * - Tasks sorted by dueDate ascending (soonest due first)
 * - Normalizes all fields with default values
 * - Converts Firestore Timestamps to JavaScript Dates
 */
export const subscribeToTasks = (callback, limitCount = 50) => {
  const q = query(collection(db, "tasks"), orderBy("dueDate", "asc"), limit(limitCount));

  return onSnapshot(q, (snap) => {
    const tasks = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        title: data.title || "",
        description: data.description || "",
        projectId: data.projectId || "",
        assigneeId: data.assigneeId || "",
        assigneeType: data.assigneeType || "user",
        status: data.status || "To-Do",
        priority: data.priority || "Medium",
        isRecurring: data.isRecurring || false,
        recurringPattern: data.recurringPattern || null,
        recurringInterval: data.recurringInterval || 1,
        selectedWeekDays: data.selectedWeekDays || null, // Ensure this is returned!
        skipWeekends: data.skipWeekends || false,
        dueDate: tsToDate(data.dueDate),
        createdAt: tsToDate(data.createdAt),
        completedAt: tsToDate(data.completedAt),
        archived: data.archived || false,
      };
    });

    callback(tasks);
  });
};

/**
 * Create a new task.
 *
 * @param {object} taskData - Task data
 * @param {string} collectionName - Collection to create in (default: "tasks")
 * @returns {Promise<string>} Document ID of created task
 *
 * Business Logic:
 * - Adds createdAt timestamp automatically
 * - Initializes archived to false
 * - Updates document with its own ID for reference
 */
export const createTask = async (taskData, collectionName = "tasks") => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...taskData,
    createdAt: serverTimestamp(),
    archived: false,
  });
  // SELF-REFERENCE: Store taskId on document for easier querying
  await updateDoc(docRef, { taskId: docRef.id });
  return docRef.id;
};

/**
 * Update an existing task.
 *
 * @param {string} taskId - Task document ID
 * @param {object} updates - Fields to update
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 */
export const updateTask = async (taskId, updates, collectionName = "tasks") => {
  await updateDoc(doc(db, collectionName, taskId), updates);
};

// ============================================================================
// SUBTASK OPERATIONS
// ============================================================================

/**
 * Add a subtask to a task's subtasks array.
 *
 * @param {string} taskId - Parent task ID
 * @param {string|object} subtaskData - Title string (legacy) or full subtask object
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<object>} Created subtask object with generated ID
 *
 * Business Logic:
 * - Supports both legacy (string) and new (object) formats for backwards compatibility
 * - Generates UUID for subtask ID
 * - Initializes order with timestamp for sorting
 * - Phase 2: Supports dependsOn array for subtask dependencies
 */
export const addSubtask = async (taskId, subtaskData, collectionName = "tasks") => {
  // BACKWARDS COMPATIBILITY: Support both string (legacy) and object formats
  const isLegacy = typeof subtaskData === "string";
  const subtask = {
    // Generate unique ID using crypto.randomUUID or fallback
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
    title: isLegacy ? subtaskData : subtaskData.title,
    description: isLegacy ? "" : (subtaskData.description || ""),
    dueDate: isLegacy ? null : (subtaskData.dueDate || null),
    assigneeId: isLegacy ? null : (subtaskData.assigneeId || null),
    priority: isLegacy ? "Medium" : (subtaskData.priority || "Medium"),
    order: isLegacy ? Date.now() : (subtaskData.order ?? Date.now()),
    dependsOn: isLegacy ? [] : (subtaskData.dependsOn || []), // PHASE 2: Dependency support
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    completedBy: null,
  };
  await updateDoc(doc(db, collectionName, taskId), {
    subtasks: arrayUnion(subtask),
  });
  return subtask;
};

/**
 * Toggle a subtask's completed state.
 *
 * @param {string} taskId - Parent task ID
 * @param {string} subtaskId - Subtask ID to toggle
 * @param {boolean} completed - New completion state
 * @param {string} collectionName - Collection name (default: "tasks")
 * @param {string} userId - User ID who completed (for audit)
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Uses transaction to prevent race conditions
 * - Phase 2: Checks dependencies before allowing completion
 * - Records completedAt and completedBy for audit trail
 *
 * @throws {Error} If subtask has uncompleted dependencies
 */
export const toggleSubtask = async (taskId, subtaskId, completed, collectionName = "tasks", userId = null) => {
  const ref = doc(db, collectionName, taskId);

  // TRANSACTION: Prevents race conditions with concurrent updates
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error("Task does not exist!");
    }

    const data = snap.data();
    const list = Array.isArray(data.subtasks) ? data.subtasks : [];

    // PHASE 2 DEPENDENCY CHECK: Cannot complete subtask if dependencies are incomplete
    if (completed) {
      const subtask = list.find((s) => s.id === subtaskId);
      if (subtask?.dependsOn?.length > 0) {
        const blockedBy = subtask.dependsOn.filter((depId) => {
          const dep = list.find((s) => s.id === depId);
          return dep && !dep.completed;
        });
        if (blockedBy.length > 0) {
          const blockedNames = blockedBy.map((depId) => {
            const dep = list.find((s) => s.id === depId);
            return dep?.title || depId;
          });
          throw new Error(`Cannot complete: blocked by "${blockedNames.join('", "')}"`);
        }
      }
    }

    const next = list.map((s) =>
      s.id === subtaskId
        ? {
          ...s,
          completed: completed,
          completedAt: completed ? new Date().toISOString() : null,
          completedBy: completed ? userId : null,
        }
        : s
    );

    transaction.update(ref, { subtasks: next });
  });
};

/**
 * Update a subtask's properties.
 *
 * @param {string} taskId - Parent task ID
 * @param {string} subtaskId - Subtask ID to update
 * @param {object} updates - Fields to update (title, description, dueDate, etc.)
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 */
export const updateSubtask = async (taskId, subtaskId, updates, collectionName = "tasks") => {
  const ref = doc(db, collectionName, taskId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error("Task does not exist!");
    }

    const data = snap.data();
    const list = Array.isArray(data.subtasks) ? data.subtasks : [];
    const next = list.map((s) =>
      s.id === subtaskId ? { ...s, ...updates } : s
    );

    transaction.update(ref, { subtasks: next });
  });
};

/**
 * Delete a subtask from a task's subtasks array.
 *
 * @param {string} taskId - Parent task ID
 * @param {string} subtaskId - Subtask ID to delete
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 */
export const deleteSubtask = async (taskId, subtaskId, collectionName = "tasks") => {
  const ref = doc(db, collectionName, taskId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error("Task does not exist!");
    }

    const data = snap.data();
    const list = Array.isArray(data.subtasks) ? data.subtasks : [];
    const next = list.filter((s) => s.id !== subtaskId);

    transaction.update(ref, { subtasks: next });
  });
};

// ============================================================================
// COMMENTS OPERATIONS
// ============================================================================

/**
 * Add a comment to task's comments subcollection.
 *
 * @param {string} taskId - Task ID
 * @param {string} text - Comment text
 * @param {object} user - User object { uid, displayName }
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 */
export const addTaskComment = async (taskId, text, user, collectionName = "tasks") => {
  const ref = collection(doc(db, collectionName, taskId), "comments");
  await addDoc(ref, {
    text,
    userId: user?.uid || "system",
    userName: user?.displayName || "System",
    createdAt: serverTimestamp(),
  });
};

/**
 * Subscribe to task comments ordered by createdAt descending.
 *
 * @param {string} taskId - Task ID
 * @param {function} callback - Called with comments array
 * @param {number} limitCount - Maximum comments to fetch (default: 20)
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {function} Unsubscribe function
 */
export const subscribeToTaskComments = (taskId, callback, limitCount = 20, collectionName = "tasks") => {
  const ref = collection(doc(db, collectionName, taskId), "comments");
  const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    callback(items);
  });
};

// ============================================================================
// TASK DELETION
// ============================================================================

/**
 * Delete a task (simple, no subcollection cleanup).
 *
 * @param {string} taskId - Task ID to delete
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 *
 * CAUTION: Does not delete subcollections (comments, activities)
 * Use deleteTaskWithRelations for complete cleanup
 */
export const deleteTask = async (taskId, collectionName = "tasks") => {
  await deleteDoc(doc(db, collectionName, taskId));
};

/**
 * Delete a task with all its subcollections (cascading delete).
 *
 * @param {string} taskId - Task ID to delete
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Deletes all activities first
 * - Deletes all comments
 * - Then deletes the task document
 * - Uses Promise.all for parallel subcollection deletion
 */
export const deleteTaskWithRelations = async (taskId, collectionName = "tasks") => {
  const taskRef = doc(db, collectionName, taskId);

  // Helper to delete all documents in a subcollection
  const deleteSubcollection = async (subName) => {
    const subRef = collection(taskRef, subName);
    const snap = await getDocs(subRef);
    const deletions = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletions);
  };

  // PARALLEL DELETE: Delete both subcollections simultaneously
  await Promise.all([
    deleteSubcollection("activities"),
    deleteSubcollection("comments"),
  ]);

  // Delete the main task document after subcollections
  await deleteDoc(taskRef);
};

// ============================================================================
// TASK STATUS OPERATIONS
// ============================================================================

/**
 * Mark task as completed.
 *
 * @param {string} taskId - Task ID
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 */
export const completeTask = async (taskId, collectionName = "tasks") => {
  await updateDoc(doc(db, collectionName, taskId), {
    status: "Done",
    completedAt: serverTimestamp(),
  });
};

/**
 * Archive a task (soft delete).
 *
 * @param {string} taskId - Task ID
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Sets archived flag to true
 * - Task is hidden from active views but preserved for reference
 */
export const archiveTask = async (taskId, collectionName = "tasks") => {
  await updateDoc(doc(db, collectionName, taskId), {
    archived: true,
  });
};

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

/**
 * Log an activity for a task (audit trail).
 *
 * @param {string} taskId - Task ID
 * @param {string} action - Action type (e.g., "status_updated", "comment_added")
 * @param {string} details - Human readable details
 * @param {object} user - User object { uid, displayName }
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 */
export const logTaskActivity = async (taskId, action, details, user, collectionName = "tasks") => {
  try {
    const ref = collection(doc(db, collectionName, taskId), "activities");
    await addDoc(ref, {
      action,
      details,
      userId: user?.uid || "system",
      userName: user?.displayName || "System",
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // SILENT FAIL: Activity logging should not break main operations
    console.error("Failed to log activity", err);
  }
};

/**
 * Log a subtask-specific activity (appears in main task timeline).
 *
 * @param {string} taskId - Parent task ID
 * @param {string} subtaskId - Subtask ID
 * @param {string} subtaskTitle - Subtask title for display
 * @param {string} action - Action type
 * @param {string} details - Human readable details
 * @param {object} user - User object
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 */
export const logSubtaskActivity = async (taskId, subtaskId, subtaskTitle, action, details, user, collectionName = "tasks") => {
  try {
    const ref = collection(doc(db, collectionName, taskId), "activities");
    await addDoc(ref, {
      action,
      details,
      subtaskId,
      subtaskTitle,
      userId: user?.uid || "system",
      userName: user?.displayName || "System",
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to log subtask activity", err);
  }
};

/**
 * Subscribe to task activities (audit log).
 *
 * @param {string} taskId - Task ID
 * @param {function} callback - Called with activities array
 * @param {number} limitCount - Maximum activities to fetch (default: 20)
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {function} Unsubscribe function
 */
export const subscribeToTaskActivities = (taskId, callback, limitCount = 20, collectionName = "tasks") => {
  const ref = collection(doc(db, collectionName, taskId), "activities");
  const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    callback(items);
  });
};

// ============================================================================
// TIME TRACKING
// ============================================================================

/**
 * Start time tracking for a user on a task.
 *
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Sets isTracking flag and records start time
 * - Uses nested field update for assigneeStatus map
 */
export const startTimeTracking = async (taskId, userId, collectionName = "tasks") => {
  const key = `assigneeStatus.${userId}`;
  await updateDoc(doc(db, collectionName, taskId), {
    [`${key}.isTracking`]: true,
    [`${key}.trackingStartTime`]: serverTimestamp(),
  });
};

/**
 * Stop time tracking and accumulate time spent.
 *
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID
 * @param {number} currentTotalSeconds - Previously accumulated time
 * @param {Date} startTime - Tracking start time
 * @param {object} userDetails - User object for activity logging
 * @param {string} collectionName - Collection name (default: "tasks")
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Calculates elapsed time from start to now
 * - Validates start time exists and is valid
 * - Caps maximum tracking at 24 hours (prevents runaway timers)
 * - Handles negative time (clock skew) gracefully
 *
 * @throws {Error} If no start time or invalid start time
 */
export const stopTimeTracking = async (taskId, userId, currentTotalSeconds, startTime, userDetails, collectionName = "tasks") => {
  // VALIDATION: Ensure we have a start time
  if (!startTime) {
    console.error("No start time found for time tracking");
    throw new Error("Cannot stop time tracking: no start time found");
  }

  const now = new Date();
  const start = startTime?.toDate ? startTime.toDate() : new Date(startTime);

  // VALIDATION: Ensure start time is valid date
  if (isNaN(start.getTime())) {
    console.error("Invalid start time:", startTime);
    throw new Error("Invalid start time for time tracking");
  }

  let diffSeconds = Math.floor((now - start) / 1000);

  // CLOCK SKEW HANDLING: Handle negative time difference gracefully
  if (diffSeconds < 0) {
    console.error("Negative time difference detected (clock skew?). Start:", start, "Now:", now);
    diffSeconds = 0;
  }

  // CAP MAXIMUM: Prevent unrealistic tracking values (max 24 hours)
  const MAX_TRACKING_SECONDS = 86400; // 24 hours
  if (diffSeconds > MAX_TRACKING_SECONDS) {
    console.warn(`Time tracking exceeded 24 hours (${Math.floor(diffSeconds / 3600)}h), capping at 24h`);
    diffSeconds = MAX_TRACKING_SECONDS;
  }

  const newTotal = Math.max(0, (currentTotalSeconds || 0) + diffSeconds);

  const key = `assigneeStatus.${userId}`;

  await updateDoc(doc(db, collectionName, taskId), {
    [`${key}.isTracking`]: false,
    [`${key}.trackingStartTime`]: null,
    [`${key}.timeSpent`]: newTotal,
  });

  // Activity logging disabled (Option 2) - uncomment if needed
};

/**
 * Complete a task, update all assignee statuses, and trigger recurrence.
 *
 * @param {object} task - The full task object (must include id, assigneeIds, etc.)
 * @param {object} user - The current user object (for logging completedBy)
 * @param {string} comment - Optional completion comment
 * @param {string} collectionName - Collection name (default: "tasks")
 */
export const completeTaskWithRecurrence = async (task, user, comment = "", collectionName = "tasks") => {
  if (!task || !task.id) throw new Error("Invalid task provided to completeTaskWithRecurrence");

  const taskRef = doc(db, collectionName, task.id);

  // Use a consistent JS Date for both Firestore and the logic check
  const timestamp = new Date();
  const userId = user?.uid || "system";

  // 1. Prepare the main updates
  const updates = {
    status: "Done",
    completedAt: timestamp, // Save as Date object (Firestore converts to Timestamp)
    progressPercent: 100,
    completionComment: comment,
  };

  // 2. Propagate "Done" status to all assignees (Legacy + Multi-assignee support)
  // This logic is copied from your TaskManagment.jsx to ensure data consistency
  const targetUids = Array.from(
    new Set([...(Array.isArray(task.assigneeIds) ? task.assigneeIds : []), task.assigneeId].filter(Boolean))
  );

  targetUids.forEach((uid) => {
    updates[`assigneeStatus.${uid}.status`] = "Done";
    updates[`assigneeStatus.${uid}.progressPercent`] = 100;
    updates[`assigneeStatus.${uid}.completedAt`] = timestamp;
    updates[`assigneeStatus.${uid}.completedBy`] = userId;
    if (comment) updates[`assigneeStatus.${uid}.completionComment`] = comment;
  });

  // 3. Update Firestore
  await updateDoc(taskRef, updates);

  // 4. Log the activity
  await logTaskActivity(
    task.id,
    "completed",
    `Marked as done${comment ? `: ${comment}` : ""}`,
    user,
    collectionName
  );
  // 5. Handle Recurrence
  try {
    // Construct the state of the task *after* it was just marked done
    const checkTask = {
      ...task,
      status: "Done",
      completedAt: timestamp,
    };

    // Check if we need to create the next one
    if (await shouldCreateNextInstanceAsync(checkTask)) {
      console.log(`Creating next recurring instance for task ${task.id}...`);
      await createNextRecurringInstance(checkTask);
    }
  } catch (err) {
    console.error("Recurrence generation failed inside service:", err);
    // We log error but don't throw, because the task *was* successfully marked done
  }
}
