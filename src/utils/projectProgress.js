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
 * - Excludes archived tasks
 * - Considers statuses: done/completed/complete as completed
 * - Writes integer percent to projects/{id}.progress
 */
export async function updateProjectProgress(projectId) {
  if (!projectId) return null;
  try {
    const q = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId)
    );
    const snap = await getDocs(q);

    let total = 0;
    let done = 0;
    snap.forEach((d) => {
      const t = d.data() || {};
      if (t.archived) return; // ignore archived tasks
      total += 1;
      const s = String(t.status || "")
        .trim()
        .toLowerCase();
      if (["done", "completed", "complete"].includes(s)) done += 1;
    });

    const progress = total === 0 ? 0 : Math.round((done / total) * 100);
    await updateDoc(doc(db, "projects", projectId), { progress });
    return progress;
  } catch (err) {
    console.error("updateProjectProgress error:", err);
    throw err;
  }
}
