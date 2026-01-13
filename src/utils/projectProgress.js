/**
 * Project Progress Calculator
 *
 * Purpose: Calculates and persists project completion percentage based on
 * the status of associated tasks.
 *
 * Responsibilities:
 * - Queries all tasks belonging to a project
 * - Calculates completion percentage from task statuses
 * - Persists the computed progress to the project document
 *
 * Dependencies:
 * - Firestore (tasks, projects collections)
 *
 * Business Logic:
 * - Archived tasks are excluded from calculation
 * - "done", "completed", "complete" statuses count as completed
 * - Progress = (completed tasks / total tasks) * 100
 * - Returns 0 if project has no tasks
 *
 * Called By:
 * - Task status update handlers
 * - Project dashboard components
 *
 * Last Modified: 2026-01-10
 */

import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

/**
 * Recompute and persist a project's progress based on its tasks.
 *
 * @param {string} projectId - The project ID to update
 * @returns {Promise<number|null>} The computed progress percentage (0-100) or null if no projectId
 *
 * Business Logic:
 * - Queries all tasks where projectId matches
 * - Excludes archived tasks from calculation
 * - Normalizes status strings for comparison (lowercase, trimmed)
 * - Accepts "done", "completed", or "complete" as completed statuses
 * - Writes integer percentage to projects/{id}.progress field
 *
 * @example
 * await updateProjectProgress("project123");
 * // Project has 5 tasks, 3 done → progress = 60
 *
 * @throws {Error} If Firestore query or update fails
 */
export async function updateProjectProgress(projectId) {
  // GUARD: Skip if no project ID provided
  if (!projectId) return null;

  try {
    // QUERY: Get all tasks for this project
    const q = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId)
    );
    const snap = await getDocs(q);

    let total = 0;
    let done = 0;

    snap.forEach((d) => {
      const t = d.data() || {};
      // FILTER: Ignore archived tasks in progress calculation
      if (t.archived) return;
      total += 1;
      // STATUS NORMALIZATION: Handle various completion status labels
      const s = String(t.status || "")
        .trim()
        .toLowerCase();
      if (["done", "completed", "complete"].includes(s)) done += 1;
    });

    // CALCULATION: Avoid division by zero, round to integer
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    // PERSIST: Update project document with calculated progress
    await updateDoc(doc(db, "projects", projectId), { progress });

    return progress;
  } catch (err) {
    console.error("updateProjectProgress error:", err);
    throw err;
  }
}
