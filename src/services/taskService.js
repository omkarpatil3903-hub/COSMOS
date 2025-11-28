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
} from "firebase/firestore";
import { db } from "../firebase";
import { tsToDate } from "../utils/dateUtils";

/**
 * Subscribe to tasks collection
 * @param {function} callback - Called with tasks array
 * @returns {function} - Unsubscribe function
 */
export const subscribeToTasks = (callback) => {
  const q = query(collection(db, "tasks"), orderBy("dueDate", "asc"));

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
export const createTask = async (taskData) => {
  const docRef = await addDoc(collection(db, "tasks"), {
    ...taskData,
    createdAt: serverTimestamp(),
    archived: false,
  });
  return docRef.id;
};

/**
 * Update an existing task
 * @param {string} taskId
 * @param {object} updates
 * @returns {Promise<void>}
 */
export const updateTask = async (taskId, updates) => {
  await updateDoc(doc(db, "tasks", taskId), updates);
};

/**
 * Add a subtask to a task's subtasks array
 * @param {string} taskId
 * @param {string} title
 */
export const addSubtask = async (taskId, title) => {
  const subtask = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
    title,
    completed: false,
  };
  await updateDoc(doc(db, "tasks", taskId), {
    subtasks: arrayUnion(subtask),
  });
};

/**
 * Toggle a subtask's completed state
 * @param {string} taskId
 * @param {string} subtaskId
 */
export const toggleSubtask = async (taskId, subtaskId) => {
  const ref = doc(db, "tasks", taskId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const list = Array.isArray(data.subtasks) ? data.subtasks : [];
  const next = list.map((s) =>
    s.id === subtaskId ? { ...s, completed: !s.completed } : s
  );
  await updateDoc(ref, { subtasks: next });
};

/**
 * Delete a subtask from a task's subtasks array
 * @param {string} taskId
 * @param {string} subtaskId
 */
export const deleteSubtask = async (taskId, subtaskId) => {
  const ref = doc(db, "tasks", taskId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const list = Array.isArray(data.subtasks) ? data.subtasks : [];
  const next = list.filter((s) => s.id !== subtaskId);
  await updateDoc(ref, { subtasks: next });
};

/**
 * Add a comment to task's comments subcollection
 * @param {string} taskId
 * @param {string} text
 * @param {{uid:string, displayName:string}} user
 */
export const addTaskComment = async (taskId, text, user) => {
  const ref = collection(doc(db, "tasks", taskId), "comments");
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
export const subscribeToTaskComments = (taskId, callback) => {
  const ref = collection(doc(db, "tasks", taskId), "comments");
  const q = query(ref, orderBy("createdAt", "desc"));
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
export const deleteTask = async (taskId) => {
  await deleteDoc(doc(db, "tasks", taskId));
};

/**
 * Mark task as completed
 * @param {string} taskId
 * @returns {Promise<void>}
 */
export const completeTask = async (taskId) => {
  await updateDoc(doc(db, "tasks", taskId), {
    status: "Done",
    completedAt: serverTimestamp(),
  });
};

/**
 * Archive a task
 * @param {string} taskId
 * @returns {Promise<void>}
 */
export const archiveTask = async (taskId) => {
  await updateDoc(doc(db, "tasks", taskId), {
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
export const logTaskActivity = async (taskId, action, details, user) => {
  try {
    const ref = collection(doc(db, "tasks", taskId), "activities");
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
export const subscribeToTaskActivities = (taskId, callback) => {
  const ref = collection(doc(db, "tasks", taskId), "activities");
  const q = query(ref, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    callback(items);
  });
};
