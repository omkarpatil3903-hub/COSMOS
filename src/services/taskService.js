/**
 * Task Service
 * Handles all Firestore operations for tasks
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

/**
 * Subscribe to tasks collection
 * @param {function} callback - Called with tasks array
 * @returns {function} - Unsubscribe function
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
 * Create a new task
 * @param {object} taskData
 * @returns {Promise<string>} - Document ID
 */
export const createTask = async (taskData, collectionName = "tasks") => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...taskData,
    createdAt: serverTimestamp(),
    archived: false,
  });
  await updateDoc(docRef, { taskId: docRef.id });
  return docRef.id;
};

/**
 * Update an existing task
 * @param {string} taskId
 * @param {object} updates
 * @returns {Promise<void>}
 */
export const updateTask = async (taskId, updates, collectionName = "tasks") => {
  await updateDoc(doc(db, collectionName, taskId), updates);
};

/**
 * Add a subtask to a task's subtasks array
 * @param {string} taskId
 * @param {string} title
 */
export const addSubtask = async (taskId, title, collectionName = "tasks") => {
  const subtask = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
    title,
    completed: false,
  };
  await updateDoc(doc(db, collectionName, taskId), {
    subtasks: arrayUnion(subtask),
  });
};

/**
 * Toggle a subtask's completed state
 * @param {string} taskId
 * @param {string} subtaskId
 */
export const toggleSubtask = async (taskId, subtaskId, completed, collectionName = "tasks") => {
  const ref = doc(db, collectionName, taskId);

  // Use transaction to prevent race conditions
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error("Task does not exist!");
    }

    const data = snap.data();
    const list = Array.isArray(data.subtasks) ? data.subtasks : [];
    const next = list.map((s) =>
      s.id === subtaskId ? { ...s, completed: completed } : s
    );

    transaction.update(ref, { subtasks: next });
  });
};

/**
 * Delete a subtask from a task's subtasks array
 * @param {string} taskId
 * @param {string} subtaskId
 */
export const deleteSubtask = async (taskId, subtaskId, collectionName = "tasks") => {
  const ref = doc(db, collectionName, taskId);

  // Use transaction to prevent race conditions
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

/**
 * Add a comment to task's comments subcollection
 * @param {string} taskId
 * @param {string} text
 * @param {{uid:string, displayName:string}} user
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
 * Subscribe to task comments ordered by createdAt desc
 * @param {string} taskId
 * @param {function} callback
 * @returns {function} unsubscribe
 */
export const subscribeToTaskComments = (taskId, callback, limitCount = 20, collectionName = "tasks") => {
  const ref = collection(doc(db, collectionName, taskId), "comments");
  const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    callback(items);
  });
};

/**
 * Delete a task
 * @param {string} taskId
 * @returns {Promise<void>}
 */
export const deleteTask = async (taskId, collectionName = "tasks") => {
  await deleteDoc(doc(db, collectionName, taskId));
};

export const deleteTaskWithRelations = async (taskId, collectionName = "tasks") => {
  const taskRef = doc(db, collectionName, taskId);

  const deleteSubcollection = async (subName) => {
    const subRef = collection(taskRef, subName);
    const snap = await getDocs(subRef);
    const deletions = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletions);
  };

  await Promise.all([
    deleteSubcollection("activities"),
    deleteSubcollection("comments"),
  ]);

  await deleteDoc(taskRef);
};

/**
 * Mark task as completed
 * @param {string} taskId
 * @returns {Promise<void>}
 */
export const completeTask = async (taskId, collectionName = "tasks") => {
  await updateDoc(doc(db, collectionName, taskId), {
    status: "Done",
    completedAt: serverTimestamp(),
  });
};

/**
 * Archive a task
 * @param {string} taskId
 * @returns {Promise<void>}
 */
export const archiveTask = async (taskId, collectionName = "tasks") => {
  await updateDoc(doc(db, collectionName, taskId), {
    archived: true,
  });
};

/**
 * Log an activity for a task
 * @param {string} taskId
 * @param {string} action - e.g., "status_updated", "comment_added"
 * @param {string} details - Human readable details
 * @param {object} user - { uid, displayName }
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
    console.error("Failed to log activity", err);
  }
};

/**
 * Subscribe to task activities
 * @param {string} taskId
 * @param {function} callback
 * @returns {function} unsubscribe
 */
export const subscribeToTaskActivities = (taskId, callback, limitCount = 20, collectionName = "tasks") => {
  const ref = collection(doc(db, collectionName, taskId), "activities");
  const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    callback(items);
  });
};

/**
 * Start time tracking for a user
 * @param {string} taskId
 * @param {string} userId
 * @param {string} collectionName
 */
export const startTimeTracking = async (taskId, userId, collectionName = "tasks") => {
  const key = `assigneeStatus.${userId}`;
  await updateDoc(doc(db, collectionName, taskId), {
    [`${key}.isTracking`]: true,
    [`${key}.trackingStartTime`]: serverTimestamp(),
  });
};

/**
 * Stop time tracking for a user
 * @param {string} taskId
 * @param {string} userId
 * @param {number} currentTotalSeconds
 * @param {Date} startTime
 * @param {object} userDetails
 * @param {string} collectionName
 */
export const stopTimeTracking = async (taskId, userId, currentTotalSeconds, startTime, userDetails, collectionName = "tasks") => {
  // Validate startTime exists
  if (!startTime) {
    console.error("No start time found for time tracking");
    throw new Error("Cannot stop time tracking: no start time found");
  }

  const now = new Date();
  const start = startTime?.toDate ? startTime.toDate() : new Date(startTime);

  // Validate start time is a valid date
  if (isNaN(start.getTime())) {
    console.error("Invalid start time:", startTime);
    throw new Error("Invalid start time for time tracking");
  }

  let diffSeconds = Math.floor((now - start) / 1000);

  // Validate time difference
  if (diffSeconds < 0) {
    console.error("Negative time difference detected (clock skew?). Start:", start, "Now:", now);
    diffSeconds = 0; // Set to 0 instead of throwing error
  }

  // Cap at 24 hours to prevent unrealistic values
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

  // Activity logging disabled (Option 2)
};
