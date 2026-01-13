/**
 * Event Service - Calendar Event CRUD Operations
 *
 * Purpose: Handles all Firestore operations for calendar events including
 * subscriptions, creation, updates, completion, and cancellation.
 *
 * Responsibilities:
 * - Real-time subscription to events collection
 * - CRUD operations for event documents
 * - Event status transitions (complete, cancel)
 * - Timestamp normalization for cross-timezone consistency
 *
 * Dependencies:
 * - Firestore (CRUD operations, onSnapshot)
 * - dateUtils (tsToDate for Firestore Timestamp conversion)
 *
 * Event Types Supported:
 * - meeting: Client meetings, internal meetings
 * - task: Task-related events
 * - deadline: Project deadlines
 * - reminder: Personal reminders
 *
 * Event Statuses:
 * - pending: Scheduled, not yet occurred
 * - completed: Successfully completed
 * - cancelled: Cancelled with reason tracking
 *
 * Last Modified: 2026-01-10
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
 * Subscribe to events collection for real-time updates.
 * Events are sorted by date in ascending order (upcoming first).
 *
 * @param {function} callback - Called with events array whenever data changes
 * @returns {function} Unsubscribe function to stop listening
 *
 * Business Logic:
 * - Normalizes all string fields to prevent undefined values
 * - Converts Firestore Timestamps to JavaScript Dates
 * - Lowercases type, status, priority for consistent comparison
 * - Defaults duration to 60 minutes if not specified
 */
export const subscribeToEvents = (callback) => {
  const q = query(collection(db, "events"), orderBy("date", "asc"));

  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        title: data.title || "",
        type: String(data.type || "meeting").toLowerCase(),
        status: String(data.status || "pending").toLowerCase(),
        date: data.date || "",
        time: data.time || "",
        duration: data.duration || 60,
        clientId: data.clientId || "",
        clientName: data.clientName || "",
        description: data.description || "",
        priority: String(data.priority || "medium").toLowerCase(),
        location: data.location || "",
        attendees: data.attendees || [],
        attendeeIds: data.attendeeIds || [],
        createdBy: data.createdBy || "",
        objectives: data.objectives || [],
        cancelReason: data.cancelReason || "",
        cancelledBy: data.cancelledBy || "",
        cancelledAt: tsToDate(data.cancelledAt),
        completedAt: tsToDate(data.completedAt),
        createdAt: tsToDate(data.createdAt),
        assignee: data.assignee || "",
        progress: data.progress || 0,
      };
    });

    callback(events);
  });
};

/**
 * Create a new event in Firestore.
 *
 * @param {object} eventData - Event data to create
 * @returns {Promise<string>} Document ID of created event
 *
 * Side Effects:
 * - Adds createdAt timestamp automatically
 */
export const createEvent = async (eventData) => {
  const docRef = await addDoc(collection(db, "events"), {
    ...eventData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Update an existing event.
 *
 * @param {string} eventId - ID of event to update
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateEvent = async (eventId, updates) => {
  await updateDoc(doc(db, "events", eventId), updates);
};

/**
 * Delete an event permanently.
 *
 * @param {string} eventId - ID of event to delete
 * @returns {Promise<void>}
 *
 * CAUTION: This is a hard delete. Consider using soft delete for audit trails.
 */
export const deleteEvent = async (eventId) => {
  await deleteDoc(doc(db, "events", eventId));
};

/**
 * Mark event as completed.
 *
 * @param {string} eventId - ID of event to complete
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Updates status to "completed"
 * - Records completion timestamp for reporting
 */
export const completeEvent = async (eventId) => {
  await updateDoc(doc(db, "events", eventId), {
    status: "completed",
    completedAt: serverTimestamp(),
  });
};

/**
 * Cancel an event with reason tracking.
 *
 * @param {string} eventId - ID of event to cancel
 * @param {string} reason - Cancellation reason for audit trail
 * @param {string} cancelledBy - User ID/name who cancelled
 * @returns {Promise<void>}
 *
 * Business Logic:
 * - Records who cancelled and why for accountability
 * - Preserves original event data for reference
 */
export const cancelEvent = async (eventId, reason, cancelledBy) => {
  await updateDoc(doc(db, "events", eventId), {
    status: "cancelled",
    cancelReason: reason,
    cancelledBy,
    cancelledAt: serverTimestamp(),
  });
};
