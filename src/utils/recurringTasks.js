// src/utils/recurringTasks.js
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Calculate the next due date based on recurring pattern
 */
export function calculateNextDueDate(currentDueDate, pattern, interval) {
  const date = new Date(currentDueDate);

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
      date.setDate(date.getDate() + interval);
  }

  return date.toISOString().slice(0, 10);
}

export function occursOnDate(task, date) {
  const base = task?.dueDate?.toDate?.()
    ? task.dueDate.toDate()
    : new Date(task.dueDate);
  if (!(base instanceof Date) || Number.isNaN(base.getTime())) return false;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  // Skip weekends if enabled
  if (task?.skipWeekends && (d.getDay() === 0 || d.getDay() === 6))
    return false;
  const endType = task.recurringEndType;
  const interval = Number(task.recurringInterval || 1);
  if (!task.isRecurring) {
    return d.getTime() === b.getTime();
  }
  if (endType === "date" && task.recurringEndDate) {
    const end = new Date(task.recurringEndDate);
    if (d > end) return false;
  }
  const diffDays = Math.floor((d - b) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return false;
  const pattern = task.recurringPattern || "daily";
  if (pattern === "daily") {
    return diffDays % interval === 0;
  }
  if (pattern === "weekly") {
    if (d.getDay() !== b.getDay()) return false;
    const weeks = Math.floor(diffDays / 7);
    return weeks % interval === 0;
  }
  if (pattern === "monthly") {
    if (d.getDate() !== b.getDate()) return false;
    const months =
      (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
    return months % interval === 0;
  }
  if (pattern === "yearly") {
    if (d.getDate() !== b.getDate() || d.getMonth() !== b.getMonth())
      return false;
    const years = d.getFullYear() - b.getFullYear();
    return years % interval === 0;
  }
  return false;
}

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

/**
 * Check if we should create the next instance of a recurring task
 */
export function shouldCreateNextInstance(task) {
  if (!task.isRecurring) return false;
  if (task.status !== "Done") return false; // Only create next when current is done

  const dueDate = new Date(task.dueDate);

  // Check if current task is completed
  if (!task.completedAt) return false;

  // Check end conditions
  if (task.recurringEndType === "date" && task.recurringEndDate) {
    const endDate = new Date(task.recurringEndDate);
    if (dueDate >= endDate) return false;
  }

  if (task.recurringEndType === "after" && task.recurringEndAfter) {
    const maxOccurrences = parseInt(task.recurringEndAfter);
    if (task.recurringOccurrenceCount >= maxOccurrences) return false;
  }

  return true;
}

/**
 * Count existing occurrences for a series by parentRecurringTaskId.
 * Includes the root implicitly by adding 1 to the children count.
 */
export async function countSeriesOccurrences(seriesId) {
  if (!seriesId) return 0;
  const q = query(
    collection(db, "tasks"),
    where("parentRecurringTaskId", "==", seriesId)
  );
  const snap = await getDocs(q);
  // children + root
  return (snap?.size || 0) + 1;
}

/**
 * Async variant that enforces "Ends after N occurrences" by counting existing series tasks.
 */
export async function shouldCreateNextInstanceAsync(task) {
  if (!task?.isRecurring) return false;
  if (task.status !== "Done") return false;

  const dueDate = new Date(task.dueDate);
  if (!task.completedAt) return false;

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
 * Create the next instance of a recurring task
 */
export async function createNextRecurringInstance(task) {
  try {
    // Calculate next due date
    const nextDueDate = calculateNextDueDate(
      task.dueDate,
      task.recurringPattern,
      task.recurringInterval
    );

    // Check if instance already exists for this date
    const existingQuery = query(
      collection(db, "tasks"),
      where(
        "parentRecurringTaskId",
        "==",
        task.parentRecurringTaskId || task.id
      ),
      where("dueDate", "==", nextDueDate)
    );

    const existingDocs = await getDocs(existingQuery);
    if (!existingDocs.empty) {
      console.log("Instance already exists for", nextDueDate);
      return null;
    }

    // Create new task instance
    const { id, ...restOfTask } = task; // Destructure id to exclude it
    const newTaskData = {
      title: restOfTask.title,
      description: restOfTask.description,
      assigneeId: restOfTask.assigneeId,
      assigneeType: restOfTask.assigneeType,
      projectId: restOfTask.projectId,
      assignedDate: new Date().toISOString().slice(0, 10),
      dueDate: nextDueDate,
      priority: restOfTask.priority,
      status: "To-Do",
      progressPercent: 0,
      createdAt: new Date(),
      completedAt: null,
      archived: false,
      completionComment: "",
      weightage: restOfTask.weightage,
      isRecurring: restOfTask.isRecurring,
      recurringPattern: restOfTask.recurringPattern,
      recurringInterval: restOfTask.recurringInterval,
      recurringEndDate: restOfTask.recurringEndDate,
      recurringEndAfter: restOfTask.recurringEndAfter,
      recurringEndType: restOfTask.recurringEndType,
      parentRecurringTaskId: restOfTask.parentRecurringTaskId || id, // Use the destructured id here
      recurringOccurrenceCount: (restOfTask.recurringOccurrenceCount || 0) + 1,
    };

    const docRef = await addDoc(collection(db, "tasks"), newTaskData);
    console.log("Created recurring task instance:", docRef.id);

    return docRef.id;
  } catch (error) {
    console.error("Error creating recurring task instance:", error);
    throw error;
  }
}

/**
 * Check all recurring tasks and create next instances if needed
 * This should be called periodically (e.g., daily via a cron job or Cloud Function)
 */
export async function processRecurringTasks() {
  try {
    const recurringQuery = query(
      collection(db, "tasks"),
      where("isRecurring", "==", true),
      where("status", "==", "Done")
    );

    const snapshot = await getDocs(recurringQuery);
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate
        ? doc.data().dueDate.toDate().toISOString().slice(0, 10)
        : doc.data().dueDate,
      completedAt: doc.data().completedAt?.toDate
        ? doc.data().completedAt.toDate()
        : doc.data().completedAt,
    }));

    const results = [];
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
