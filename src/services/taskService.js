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
  serverTimestamp,
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
